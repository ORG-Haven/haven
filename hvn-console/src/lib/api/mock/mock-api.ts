import type { HavenApi } from "../client";
import { ApiError } from "../errors";
import type {
  Deployment,
  OAuthProvider,
  Environment,
  Observability,
  Pipeline,
  Project,
  ProjectHealth,
  ProjectSummary,
  Session,
} from "../types";
import {
  DEFAULT_GATES,
  GATEWAY_IP,
  SEED_REPOS,
  envUrl,
  seedProjects,
  steps,
  type ProjectRecord,
} from "./seed";

const db = {
  projects: seedProjects(),
  repos: SEED_REPOS,
  users: [{ username: "demo", email: "demo@haven.dev", password: "haven1234", verified: true }],
  session: null as Session | null,
};
let nextId = 100;

// Simulated network latency so loading states are visible in development.
const latency = () => new Promise<void>((r) => setTimeout(r, 350 + Math.random() * 450));

async function respond<T>(value: T): Promise<T> {
  await latency();
  return structuredClone(value);
}

function record(projectId: string): ProjectRecord {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p) throw new ApiError(404, `Project ${projectId} not found`);
  return p;
}

function health(p: ProjectRecord): ProjectHealth {
  if (p.environments.some((e) => e.status === "failed")) return "failing";
  if (p.environments.some((e) => e.status === "waiting")) return "attention";
  return "healthy";
}

function summary(p: ProjectRecord): ProjectSummary {
  const latest = [...p.deployments]
    .filter((d) => d.status === "succeeded")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  return {
    id: p.id,
    name: p.name,
    repo: p.repo,
    branch: p.branch,
    domain: p.domain,
    color: p.color,
    health: health(p),
    pendingApprovals: p.deployments.filter((d) => d.status === "awaiting_approval").length,
    environments: p.environments.map((e) => ({ name: e.name, status: e.status })),
    lastDeploy: latest && { env: latest.env, at: latest.createdAt, sha: latest.sha },
  };
}

function detail(p: ProjectRecord): Project {
  return {
    ...summary(p),
    framework: p.framework,
    createdAt: p.createdAt,
    gatewayIp: p.gatewayIp,
    dnsVerified: p.dnsVerified,
    tlsActive: p.dnsVerified,
    dnsRecords: [
      { type: "A", name: "@", value: p.gatewayIp, found: p.dnsVerified },
      { type: "A", name: "*", value: p.gatewayIp, found: p.dnsVerified },
    ],
  };
}

function nextEnvName(p: ProjectRecord, env: string) {
  const i = p.environments.findIndex((e) => e.name === env);
  return p.environments[i + 1]?.name;
}

function addDeployment(p: ProjectRecord, d: Omit<Deployment, "id" | "createdAt">): Deployment {
  const dep: Deployment = { ...d, id: `d${nextId++}`, createdAt: new Date().toISOString() };
  p.deployments.unshift(dep);
  return dep;
}

function hvnYaml(p: ProjectRecord) {
  const lines = ["# managed by the hvn plugin", `project: ${p.name}`, "environments:"];
  p.environments.forEach((e, i) => {
    lines.push(`  - name: ${e.name}`);
    if (i === 0) lines.push("    deploy: on-push");
    const gate = p.gates.find((g) => g.from === e.name);
    if (gate) {
      const when = gate.mode === "auto" ? "[tests-passed]" : gate.to === "prod" ? "[user-approved, smoke-tests-passed]" : "[user-accepted]";
      lines.push(`    promote: { to: ${gate.to}, when: ${when} }`);
    }
    if (e.name === "prod") lines.push("    rollout: gradual");
  });
  return lines.join("\n");
}

function series(scale: number, seed: number) {
  return Array.from({ length: 25 }, (_, h) => {
    const daily = 0.55 + 0.4 * Math.sin(((h - 8) / 24) * Math.PI * 2);
    const wobble = 0.06 * Math.sin(h * 2.3 + seed) + 0.04 * Math.cos(h * 1.7 + seed);
    return Math.round(Math.max(0.05, Math.min(1, daily + wobble)) * scale);
  });
}

export const mockApi: HavenApi = {
  getCluster: () => respond({ name: "senith-cluster", nodes: 3, healthy: true }),

  listRepos: () => respond(db.repos.map((r) => ({ ...r, onHaven: db.projects.some((p) => p.repo === r.fullName) }))),

  listProjects: () => respond(db.projects.map(summary)),

  getProject: async (projectId) => respond(detail(record(projectId))),

  createProject: async ({ repo, name, domain }) => {
    await latency();
    if (db.projects.some((p) => p.id === name)) throw new ApiError(409, `A project named ${name} already exists`);
    const env = (n: string, hostname: string): Environment => ({
      name: n, hostname, url: envUrl(hostname, domain), status: "not_deployed", summary: "Not deployed yet",
    });
    const p: ProjectRecord = {
      id: name, name, repo, branch: "main", framework: db.repos.find((r) => r.fullName === repo)?.framework ?? "Node.js",
      domain, color: "#0F9D8A", createdAt: new Date().toISOString(), gatewayIp: GATEWAY_IP, dnsVerified: false,
      environments: [env("dev", "dev"), env("qa", "qa"), env("uat", "uat"), env("staging", "staging"), env("prod", "")],
      gates: DEFAULT_GATES, deployments: [], agents: [],
      observability: {},
    };
    p.environments[0] = { ...p.environments[0], status: "healthy", summary: "Every push to main", version: "v0.1.0", sha: "0a1b2c3" };
    addDeployment(p, {
      env: "dev", message: "Initial deploy", sha: "0a1b2c3", version: "v0.1.0", triggeredBy: "You", status: "succeeded",
      durationSec: 140, from: "push to main", gate: { result: "passed", text: "Passed: build" },
      steps: steps([["Build app from main", "1m 40s"], ["Roll out new version", "20s"], ["Health checks", "10s"]]),
      logs: [{ text: `live at ${p.environments[0].url}`, tone: "ok" }],
    });
    db.projects.push(p);
    return structuredClone(detail(p));
  },

  deleteProject: async (projectId) => {
    await latency();
    record(projectId);
    db.projects = db.projects.filter((p) => p.id !== projectId);
  },

  updateDomain: async (projectId, domain) => {
    const p = record(projectId);
    p.domain = domain;
    p.dnsVerified = false;
    p.environments.forEach((e) => (e.url = envUrl(e.hostname, domain)));
    return respond(detail(p));
  },

  getPipeline: async (projectId) => {
    const p = record(projectId);
    const waiting = p.deployments.find((d) => d.status === "awaiting_approval");
    const pipeline: Pipeline = {
      stages: p.environments,
      gates: p.gates,
      pending: waiting && {
        deploymentId: waiting.id,
        version: waiting.version,
        env: waiting.env,
        url: p.environments.find((e) => e.name === waiting.env)?.url ?? "",
        nextEnv: nextEnvName(p, waiting.env) ?? "",
      },
    };
    return respond(pipeline);
  },

  acceptPromotion: async (projectId, deploymentId) => {
    await latency();
    const p = record(projectId);
    const d = p.deployments.find((x) => x.id === deploymentId);
    if (!d || d.status !== "awaiting_approval") throw new ApiError(409, "This release is no longer waiting for approval");
    d.status = "succeeded";
    d.gate = { result: "passed", text: "Passed: accepted by you" };
    d.steps = d.steps.map((s) => (s.status === "waiting" ? { ...s, status: "done", duration: "now" } : s));
    Object.assign(p.environments.find((e) => e.name === d.env)!, { status: "healthy", summary: "Accepted" });
    const to = nextEnvName(p, d.env);
    if (to) {
      const target = p.environments.find((e) => e.name === to)!;
      Object.assign(target, { version: d.version, sha: d.sha, status: "healthy" });
      addDeployment(p, {
        env: to, message: d.message, sha: d.sha, version: d.version, triggeredBy: `You (accepted in ${d.env})`,
        status: "succeeded", durationSec: 128, from: d.env, gate: { result: "passed", text: "Passed: smoke tests" },
        steps: steps([[`Reuse image from ${d.env}`, "0s"], ["Roll out new version", "36s"], ["Health checks", "18s"], ["Run smoke tests", "1m 14s"]]),
        logs: [{ text: `promote ${d.env} → ${to}  ${d.version}` }, { text: "smoke: 12 passed", tone: "ok" }],
      });
    }
  },

  rejectPromotion: async (projectId, deploymentId) => {
    await latency();
    const p = record(projectId);
    const d = p.deployments.find((x) => x.id === deploymentId);
    if (!d || d.status !== "awaiting_approval") throw new ApiError(409, "This release is no longer waiting for approval");
    d.status = "rejected";
    d.gate = { result: "blocked", text: "Rejected by you — not promoted" };
    d.steps = d.steps.map((s) => (s.status === "waiting" ? { ...s, status: "failed", duration: "rejected" } : s));
    Object.assign(p.environments.find((e) => e.name === d.env)!, { status: "healthy", summary: "Rejected — not promoted" });
  },

  listDeployments: async (projectId) =>
    respond([...record(projectId).deployments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),

  redeploy: async (projectId, env) => {
    await latency();
    const p = record(projectId);
    const e = p.environments.find((x) => x.name === env);
    if (!e) throw new ApiError(404, `Environment ${env} not found`);
    const dep = addDeployment(p, {
      env, message: "Redeploy", sha: e.sha ?? "—", version: e.version ?? "—", triggeredBy: "You", status: "succeeded",
      durationSec: 64, from: env, gate: { result: "passed", text: "Passed: health checks" },
      steps: steps([["Reuse current image", "0s"], ["Restart instances", "40s"], ["Health checks", "24s"]]),
      logs: [{ text: `redeployed ${env} ${e.version ?? ""}` }, { text: "health 200 OK", tone: "ok" }],
    });
    return structuredClone(dep);
  },

  rollback: async (projectId, deploymentId) => {
    await latency();
    const p = record(projectId);
    const src = p.deployments.find((x) => x.id === deploymentId);
    if (!src) throw new ApiError(404, "Deployment not found");
    const e = p.environments.find((x) => x.name === src.env)!;
    Object.assign(e, { version: src.version, sha: src.sha, status: "healthy" });
    const dep = addDeployment(p, {
      env: src.env, message: `Roll back to ${src.version}`, sha: src.sha, version: src.version, triggeredBy: "You (rollback)",
      status: "succeeded", durationSec: 52, from: src.env, gate: { result: "passed", text: "Passed: health checks" },
      steps: steps([[`Reuse image ${src.sha}`, "0s"], ["Roll out previous version", "34s"], ["Health checks", "18s"]]),
      logs: [{ text: `rolled back ${src.env} to ${src.version}`, tone: "ok" }],
    });
    return structuredClone(dep);
  },

  listEnvironments: async (projectId) => respond(record(projectId).environments),

  updateHostname: async (projectId, env, hostname) => {
    const p = record(projectId);
    const clean = hostname.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (p.environments.some((e) => e.name !== env && e.hostname === clean)) {
      await latency();
      throw new ApiError(409, `${clean || p.domain} is already used by another environment`);
    }
    const e = p.environments.find((x) => x.name === env);
    if (!e) throw new ApiError(404, `Environment ${env} not found`);
    e.hostname = clean;
    e.url = envUrl(clean, p.domain);
    return respond(e);
  },

  getHvnYaml: async (projectId) => respond(hvnYaml(record(projectId))),

  getObservability: async (projectId, env) => {
    const p = record(projectId);
    const e = p.environments.find((x) => x.name === env);
    if (!e) throw new ApiError(404, `Environment ${env} not found`);
    const seed = p.observability[env] ?? {
      scale: 2,
      kpis: [{ label: "Requests / min", value: "0", note: "No traffic yet", tone: "neutral" as const }],
      issues: [],
    };
    const obs: Observability = {
      env,
      host: e.url.replace("https://", ""),
      kpis: seed.kpis,
      requestsPerMinute: series(seed.scale, env.length),
      deploy: seed.deployHoursAgo !== undefined && e.version ? { hoursAgo: seed.deployHoursAgo, version: e.version } : undefined,
      issues: seed.issues,
    };
    return respond(obs);
  },

  listAgents: async (projectId) => respond(record(projectId).agents),

  revokeAgent: async (projectId, agentId) => {
    await latency();
    const p = record(projectId);
    p.agents = p.agents.filter((a) => a.id !== agentId);
  },
  getSession: () => respond(db.session),

  signIn: async ({ email, password }) => {
    await latency();
    const u = db.users.find((x) => x.email === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new ApiError(401, "That email and password don’t match.");
    if (!u.verified) throw new ApiError(403, "Verify your email before signing in. Check your inbox for the link.");
    db.session = { user: { username: u.username, email: u.email }, provider: "password" };
    return structuredClone(db.session);
  },

  signUp: async ({ username, email, password }) => {
    await latency();
    const clean = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === clean)) throw new ApiError(409, "An account with this email already exists.", "email_taken");
    // The mock has no inbox, so new accounts count as verified and are signed straight in.
    const handle = username.trim().toLowerCase();
    if (db.users.some((u) => u.username === handle)) throw new ApiError(409, "That username is taken. Try another.", "username_taken");
    db.users.push({ username: handle, email: clean, password, verified: true });
    db.session = { user: { username: handle, email: clean }, provider: "password" };
    return structuredClone(db.session);
  },

  signInWithProvider: async (provider: OAuthProvider) => {
    // The real flow redirects to Google or GitHub and back; the mock signs straight in.
    await latency();
    const label = provider === "google" ? "Google" : "GitHub";
    db.session = { user: { username: `${provider}-user`, email: `you@${provider}.example` }, provider };
    return structuredClone(db.session);
  },

  signOut: async () => {
    await latency();
    db.session = null;
  },

  // Both always succeed so the response does not reveal which emails have accounts.
  requestPasswordReset: async () => latency(),
  resendVerification: async () => latency(),
};
