// Domain types shared by the API client, the mock backend and the UI.
// They describe what the console needs from the BFF, not how the cluster works.

export type EnvStatus = "healthy" | "waiting" | "failed" | "not_deployed";
export type ProjectHealth = "healthy" | "attention" | "failing";
export type DeploymentStatus = "succeeded" | "failed" | "awaiting_approval" | "rejected";
export type GateMode = "auto" | "manual";
export type StepStatus = "done" | "failed" | "waiting" | "skipped";
export type IssueSeverity = "error" | "warning";
export type Tone = "ok" | "warn" | "err" | "neutral";

export interface Cluster {
  name: string;
  nodes: number;
  healthy: boolean;
}

export interface Repo {
  fullName: string;
  name: string;
  framework: string;
  updatedAt: string;
  onHaven: boolean;
}

export interface EnvironmentSummary {
  name: string;
  status: EnvStatus;
}

export interface ProjectSummary {
  id: string;
  name: string;
  repo: string;
  branch: string;
  domain: string;
  color: string;
  health: ProjectHealth;
  pendingApprovals: number;
  environments: EnvironmentSummary[];
  lastDeploy?: { env: string; at: string; sha: string };
}

export interface DnsRecord {
  type: "A";
  name: string;
  value: string;
  found: boolean;
}

export interface Project extends ProjectSummary {
  framework: string;
  createdAt: string;
  gatewayIp: string;
  dnsVerified: boolean;
  tlsActive: boolean;
  dnsRecords: DnsRecord[];
}

export interface Environment {
  name: string;
  hostname: string; // prefix only; "" means the bare project domain
  url: string;
  status: EnvStatus;
  summary: string;
  version?: string;
  sha?: string;
}

export interface PromotionGate {
  from: string;
  to: string;
  mode: GateMode;
  label: string;
}

export interface PendingPromotion {
  deploymentId: string;
  version: string;
  env: string;
  url: string;
  nextEnv: string;
}

export interface Pipeline {
  stages: Environment[];
  gates: PromotionGate[];
  pending?: PendingPromotion;
}

export interface DeployStep {
  name: string;
  status: StepStatus;
  duration?: string;
}

export interface LogLine {
  text: string;
  tone?: Tone;
}

export interface Deployment {
  id: string;
  env: string;
  message: string;
  sha: string;
  version: string;
  triggeredBy: string;
  status: DeploymentStatus;
  createdAt: string;
  durationSec: number;
  from: string;
  gate: { result: "passed" | "blocked" | "pending"; text: string };
  steps: DeployStep[];
  logs: LogLine[];
}

export interface Kpi {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  trend?: "up" | "flat";
}

export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
  meta: string;
}

export interface Observability {
  env: string;
  host: string;
  kpis: Kpi[];
  requestsPerMinute: number[]; // 25 points, oldest first, last 24h
  deploy?: { hoursAgo: number; version: string };
  issues: Issue[];
}

export interface Agent {
  id: string;
  name: string;
  kind: "claude-code" | "token";
  scope: string;
  connected: boolean;
}

export interface CreateProjectInput {
  repo: string;
  name: string;
  domain: string;
  rootDir: string;
}

// ---------- Auth ----------

export type OAuthProvider = "google" | "github";

export interface User {
  username: string;
  email: string;
}

export interface Session {
  user: User;
  provider: OAuthProvider | "password";
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput {
  username: string;
  email: string;
  password: string;
}
