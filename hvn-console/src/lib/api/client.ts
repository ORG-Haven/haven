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
  /** Creates an unverified account; the user must open the emailed link before signing in. */
  signUp(input: SignUpInput): Promise<{ email: string }>;
  signInWithProvider(provider: OAuthProvider): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
}

// hvnBFF only serves sign-up so far; everything else still comes from the in-memory mock.
// Move each method over as its BFF endpoint lands.
export const api: HavenApi = {
  ...mockApi,
  signUp: async (input) => {
    const user = await request<{ id: string; name: string; email: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return { email: user.email };
  },
};
