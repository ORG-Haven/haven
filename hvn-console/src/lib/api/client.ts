import type {
  Agent,
  Cluster,
  CreateProjectInput,
  Deployment,
  Environment,
  Observability,
  Pipeline,
  Project,
  ProjectSummary,
  OAuthProvider,
  Repo,
  Session,
  SignInInput,
  SignUpInput,
} from "./types";
import { ApiError } from "./errors";
import { request } from "./http";
import { mockApi } from "./mock/mock-api";

/**
 * Everything the console needs from the backend. Pages only talk to this
 * interface through the React Query hooks, so swapping the mock for the real
 * BFF client is a one-line change below.
 */
export interface HavenApi {
  getCluster(): Promise<Cluster>;
  listRepos(): Promise<Repo[]>;

  listProjects(): Promise<ProjectSummary[]>;
  getProject(projectId: string): Promise<Project>;
  createProject(input: CreateProjectInput): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  updateDomain(projectId: string, domain: string): Promise<Project>;

  getPipeline(projectId: string): Promise<Pipeline>;
  acceptPromotion(projectId: string, deploymentId: string): Promise<void>;
  rejectPromotion(projectId: string, deploymentId: string): Promise<void>;

  listDeployments(projectId: string): Promise<Deployment[]>;
  redeploy(projectId: string, env: string): Promise<Deployment>;
  rollback(projectId: string, deploymentId: string): Promise<Deployment>;

  listEnvironments(projectId: string): Promise<Environment[]>;
  updateHostname(projectId: string, env: string, hostname: string): Promise<Environment>;
  getHvnYaml(projectId: string): Promise<string>;

  getObservability(projectId: string, env: string): Promise<Observability>;

  listAgents(projectId: string): Promise<Agent[]>;
  revokeAgent(projectId: string, agentId: string): Promise<void>;

  getSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  /** Creates the account and signs the new user in. */
  signUp(input: SignUpInput): Promise<Session>;
  signInWithProvider(provider: OAuthProvider): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
}

// Email and password auth goes through hvnBFF, which proxy.ts serves under /api on the console's
// own origin. The BFF keeps the session in an httpOnly cookie, so these calls never see a token.
// Everything else still comes from the in-memory mock; move each method over as its BFF endpoint lands.
interface BffUser {
  id: string;
  username: string;
  email: string;
}

const toSession = ({ user }: { user: BffUser }): Session => ({ user: { username: user.username, email: user.email }, provider: "password" });

export const api: HavenApi = {
  ...mockApi,
  getSession: async () => {
    try {
      return toSession(await request<{ user: BffUser }>("/api/auth/session"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return null;
      throw err;
    }
  },
  signIn: async (input) =>
    toSession(await request<{ user: BffUser }>("/api/auth/signin", { method: "POST", body: JSON.stringify(input) })),
  signUp: async (input) =>
    toSession(await request<{ user: BffUser }>("/api/auth/signup", { method: "POST", body: JSON.stringify(input) })),
  signOut: () => request<void>("/api/auth/signout", { method: "POST" }),
  // TODO: Google and GitHub sign-in need OAuth in hvnBFF. Until then the buttons explain that.
  signInWithProvider: async (provider) => {
    const label = provider === "google" ? "Google" : "GitHub";
    throw new ApiError(501, `Signing in with ${label} isn’t available yet. Use your email and password.`);
  },
};
