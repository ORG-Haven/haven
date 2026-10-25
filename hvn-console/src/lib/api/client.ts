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

// TODO: replace with an HTTP client for hvnBFF once its endpoints exist.
export const api: HavenApi = mockApi;
