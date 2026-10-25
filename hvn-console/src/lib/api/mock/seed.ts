import type {
  Agent,
  Deployment,
  DeployStep,
  Environment,
  Kpi,
  Issue,
  LogLine,
  PromotionGate,
  Repo,
  StepStatus,
} from "../types";

// In-memory model of what the BFF would return. Mutations in mock-api.ts edit it,
// so the console behaves consistently until the page is reloaded.

export interface ProjectRecord {
  id: string;
  name: string;
  repo: string;
  branch: string;
  framework: string;
  domain: string;
  color: string;
  createdAt: string;
  gatewayIp: string;
  dnsVerified: boolean;
  environments: Environment[];
  gates: PromotionGate[];
  deployments: Deployment[];
  agents: Agent[];
  observability: Record<string, ObservabilitySeed>;
}

export interface ObservabilitySeed {
  scale: number;
  deployHoursAgo?: number;
  kpis: Kpi[];
  issues: Issue[];
}

export const GATEWAY_IP = "203.0.113.42";

export const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

export const envUrl = (hostname: string, domain: string) =>
  `https://${hostname ? `${hostname}.${domain}` : domain}`;

export function steps(spec: [string, string?][], failAt?: number, waitAt?: number): DeployStep[] {
  return spec.map(([name, duration], i) => {
    let status: StepStatus = "done";
    if (failAt === i) status = "failed";
    else if (waitAt === i) status = "waiting";
    else if (failAt !== undefined && i > failAt) status = "skipped";
    return { name, duration: status === "skipped" ? undefined : duration, status };
  });
}

const log = (text: string, tone?: LogLine["tone"]): LogLine => ({ text, tone });

export const DEFAULT_GATES: PromotionGate[] = [
  { from: "dev", to: "qa", mode: "auto", label: "Unit tests" },
  { from: "qa", to: "uat", mode: "auto", label: "E2E tests" },
  { from: "uat", to: "staging", mode: "manual", label: "You accept" },
  { from: "staging", to: "prod", mode: "manual", label: "Approve + smoke" },
];

const healthyKpis = (rpm: string, note: string): Kpi[] => [
  { label: "Requests / min", value: rpm, note, tone: "neutral" },
  { label: "Errors", value: "0.0%", note: "None in 24h", tone: "ok" },
  { label: "Response time (p95)", value: "210 ms", note: "Normal", tone: "ok" },
  { label: "Uptime", value: "99.9%", note: "Last 30 days", tone: "ok" },
];

function lumenNotes(): ProjectRecord {
  const domain = "lumennotes.app";
  const env = (name: string, hostname: string, status: Environment["status"], summary: string, version: string, sha: string): Environment => ({
    name, hostname, url: envUrl(hostname, domain), status, summary, version, sha,
  });
  return {
    id: "lumen-notes",
    name: "lumen-notes",
    repo: "senith/lumen-notes",
    branch: "main",
    framework: "Next.js",
    domain,
    color: "#2F6FE4",
    createdAt: "2026-09-12T09:30:00Z",
    gatewayIp: GATEWAY_IP,
    dnsVerified: true,
    environments: [
      env("dev", "dev", "healthy", "Every push to main", "v1.14.0", "e93d1b0"),
      env("qa", "qa", "healthy", "Auto-tested", "v1.14.0", "e93d1b0"),
      env("uat", "uat", "waiting", "Awaiting acceptance", "v1.14.0", "e93d1b0"),
      env("staging", "staging", "healthy", "Mirror of prod", "v1.13.2", "a41f9c2"),
      env("prod", "", "healthy", "Live", "v1.13.2", "a41f9c2"),
    ],
    gates: DEFAULT_GATES,
    deployments: [
      {
        id: "d1", env: "uat", message: "Add markdown export", sha: "e93d1b0", version: "v1.14.0", triggeredBy: "Claude Code",
        status: "awaiting_approval", createdAt: ago(8), durationSec: 72, from: "qa",
        gate: { result: "pending", text: "Next: you accept this release in UAT → promotes to staging" },
        steps: steps([["Reuse image from qa", "0s"], ["Roll out new version", "38s"], ["Health checks", "21s"], ["Route traffic to uat.lumennotes.app", "4s"], ["Waiting for your acceptance", "—"]], undefined, 4),
        logs: [log("12:41:03  promote qa → uat  v1.14.0"), log("12:41:41  2/2 instances ready"), log("12:42:02  health /api/health 200 OK", "ok"), log("12:42:06  live at https://uat.lumennotes.app"), log("12:42:06  waiting on gate: user-accept", "warn")],
      },
      {
        id: "d2", env: "qa", message: "Add markdown export", sha: "e93d1b0", version: "v1.14.0", triggeredBy: "auto-promote",
        status: "succeeded", createdAt: ago(14), durationSec: 270, from: "dev",
        gate: { result: "passed", text: "Passed: e2e tests in qa (48/48)" },
        steps: steps([["Reuse image from dev", "0s"], ["Roll out new version", "41s"], ["Health checks", "19s"], ["Run e2e tests", "3m 22s"], ["Auto-promote to uat", "8s"]]),
        logs: [log("12:31:10  promote dev → qa  v1.14.0"), log("12:32:10  e2e: running 48 tests"), log("12:35:32  e2e: 48 passed, 0 failed", "ok"), log("12:35:40  gate qa-e2e met → promoting to uat")],
      },
      {
        id: "d3", env: "dev", message: "Add markdown export", sha: "e93d1b0", version: "v1.14.0", triggeredBy: "Claude Code",
        status: "succeeded", createdAt: ago(19), durationSec: 185, from: "push to main",
        gate: { result: "passed", text: "Passed: unit tests (212/212)" },
        steps: steps([["Build app from main", "1m 48s"], ["Run unit tests", "52s"], ["Roll out new version", "17s"], ["Health checks", "8s"], ["Auto-promote to qa", "0s"]]),
        logs: [log("12:26:02  build: detected Next.js 15"), log("12:27:50  build: image ready (184 MB)"), log("12:28:42  tests: 212 passed", "ok"), log("12:29:07  live at https://dev.lumennotes.app")],
      },
      {
        id: "d4", env: "dev", message: "Try streaming note sync", sha: "5c7a0e4", version: "—", triggeredBy: "Claude Code",
        status: "failed", createdAt: ago(62), durationSec: 161, from: "push to main",
        gate: { result: "blocked", text: "Blocked: unit tests failed (3 of 209)" },
        steps: steps([["Build app from main", "1m 51s"], ["Run unit tests", "50s"], ["Roll out new version"], ["Health checks"], ["Auto-promote to qa"]], 1),
        logs: [log("11:40:12  build: image ready (186 MB)"), log("11:41:02  tests: 206 passed, 3 failed", "err"), log("11:41:02  FAIL sync.test.ts › resolves conflicts", "err"), log("11:41:02  dev kept on previous version a41f9c2")],
      },
      {
        id: "d5", env: "prod", message: "Fix sidebar flicker", sha: "a41f9c2", version: "v1.13.2", triggeredBy: "Senith (approved)",
        status: "succeeded", createdAt: ago(125), durationSec: 94, from: "staging",
        gate: { result: "passed", text: "Passed: manual approval + smoke tests" },
        steps: steps([["Reuse image from staging", "0s"], ["Roll out gradually (25% → 100%)", "1m 02s"], ["Health checks", "24s"], ["Route traffic to lumennotes.app", "8s"]]),
        logs: [log("10:58:20  approved by senith"), log("10:59:22  100% traffic on v1.13.2"), log("10:59:46  health 200 OK", "ok")],
      },
      {
        id: "d6", env: "staging", message: "Fix sidebar flicker", sha: "a41f9c2", version: "v1.13.2", triggeredBy: "Senith (accepted)",
        status: "succeeded", createdAt: ago(190), durationSec: 130, from: "uat",
        gate: { result: "passed", text: "Passed: smoke tests (12/12)" },
        steps: steps([["Reuse image from uat", "0s"], ["Roll out new version", "36s"], ["Health checks", "18s"], ["Run smoke tests", "1m 16s"]]),
        logs: [log("09:51:02  promote uat → staging"), log("09:53:12  smoke: 12 passed", "ok")],
      },
      {
        id: "d7", env: "qa", message: "Bump next to 15.1", sha: "0f2b8de", version: "v1.13.1", triggeredBy: "auto-promote",
        status: "failed", createdAt: ago(60 * 26), durationSec: 302, from: "dev",
        gate: { result: "blocked", text: "Blocked: e2e tests failed (2 of 46)" },
        steps: steps([["Reuse image from dev", "0s"], ["Roll out new version", "40s"], ["Health checks", "20s"], ["Run e2e tests", "4m 02s"], ["Auto-promote to uat"]], 3),
        logs: [log("16:10:44  e2e: 44 passed, 2 failed", "err"), log("16:10:44  FAIL login.spec › redirects after sign-in", "err")],
      },
    ],
    agents: [
      { id: "a1", name: "Claude Code · MacBook", kind: "claude-code", scope: "Can deploy to dev–staging · prod needs your approval", connected: true },
      { id: "a2", name: "CI token", kind: "token", scope: "Read-only · last used 5d ago", connected: true },
    ],
    observability: {
      dev: { scale: 12, deployHoursAgo: 0.3, kpis: healthyKpis("9", "Mostly you and your agent"), issues: [] },
      qa: { scale: 30, deployHoursAgo: 0.25, kpis: healthyKpis("22", "From e2e test runs"), issues: [] },
      uat: { scale: 8, deployHoursAgo: 0.15, kpis: healthyKpis("3", "Waiting on your review"), issues: [] },
      staging: {
        scale: 40, deployHoursAgo: 3,
        kpis: [
          { label: "Requests / min", value: "31", note: "Smoke tests + checks", tone: "neutral" },
          { label: "Errors", value: "0.2%", note: "Normal", tone: "ok" },
          { label: "Response time (p95)", value: "280 ms", note: "Normal", tone: "ok" },
          { label: "Uptime", value: "99.7%", note: "3 restarts today", tone: "warn" },
        ],
        issues: [
          { id: "i3", severity: "warning", title: "App restarted 3 times — ran out of memory", detail: "Memory climbs while importing large notebooks, then the app restarts. Users would see a few seconds of errors.", meta: "staging · first seen 6h ago · v1.13.2" },
        ],
      },
      prod: {
        scale: 1400, deployHoursAgo: 2,
        kpis: [
          { label: "Requests / min", value: "1,184", note: "+12% vs yesterday", tone: "ok", trend: "up" },
          { label: "Errors", value: "0.6%", note: "Up from 0.1% after v1.13.2", tone: "err", trend: "up" },
          { label: "Response time (p95)", value: "1.2 s", note: "/api/search is slow", tone: "warn" },
          { label: "Uptime", value: "99.98%", note: "Last 30 days", tone: "ok" },
        ],
        issues: [
          { id: "i1", severity: "error", title: "TypeError: Cannot read properties of undefined (reading 'title')", detail: "Opening a note that was shared and then deleted crashes the note page. 214 visitors hit this.", meta: "prod · /api/notes/[id] · 412 events · started after v1.13.2" },
          { id: "i2", severity: "warning", title: "Search is slow for large accounts", detail: "/api/search takes over 1 second for 5% of requests, mostly accounts with 2,000+ notes.", meta: "prod · /api/search · p95 1.8s · ongoing 3 days" },
        ],
      },
    },
  };
}

function simpleProject(opts: {
  id: string; repo: string; framework: string; domain: string; color: string; createdAt: string;
  envs: { name: string; status: Environment["status"]; version: string; sha: string }[];
  deployments: Deployment[];
}): ProjectRecord {
  const environments = opts.envs.map((e): Environment => {
    const hostname = e.name === "prod" ? "" : e.name;
    return {
      name: e.name, hostname, url: envUrl(hostname, opts.domain), status: e.status, version: e.version, sha: e.sha,
      summary: e.name === "prod" ? "Live" : e.name === "dev" ? "Every push to main" : "Auto-tested",
    };
  });
  const gates: PromotionGate[] = environments.slice(0, -1).map((e, i) => ({
    from: e.name, to: environments[i + 1].name,
    mode: environments[i + 1].name === "prod" ? "manual" : "auto",
    label: environments[i + 1].name === "prod" ? "You approve" : "Tests pass",
  }));
  return {
    id: opts.id, name: opts.id, repo: opts.repo, branch: "main", framework: opts.framework, domain: opts.domain,
    color: opts.color, createdAt: opts.createdAt, gatewayIp: GATEWAY_IP, dnsVerified: true,
    environments, gates, deployments: opts.deployments,
    agents: [{ id: "a1", name: "Claude Code · MacBook", kind: "claude-code", scope: "Can deploy to every environment except prod", connected: true }],
    observability: Object.fromEntries(environments.map((e) => [e.name, { scale: e.name === "prod" ? 240 : 10, deployHoursAgo: 6, kpis: healthyKpis(e.name === "prod" ? "196" : "4", "Normal traffic"), issues: [] }])),
  };
}

export function seedProjects(): ProjectRecord[] {
  return [
    lumenNotes(),
    simpleProject({
      id: "pantry-api", repo: "senith/pantry-api", framework: "FastAPI", domain: "pantry.dev", color: "#7B61FF", createdAt: "2026-08-02T10:00:00Z",
      envs: [
        { name: "dev", status: "healthy", version: "v0.9.4", sha: "7be20d1" },
        { name: "qa", status: "failed", version: "v0.9.3", sha: "c19a2e0" },
        { name: "prod", status: "healthy", version: "v0.9.3", sha: "c19a2e0" },
      ],
      deployments: [
        {
          id: "p1", env: "qa", message: "Add pantry sharing", sha: "7be20d1", version: "v0.9.4", triggeredBy: "auto-promote",
          status: "failed", createdAt: ago(12), durationSec: 210, from: "dev",
          gate: { result: "blocked", text: "Blocked: API tests failed (4 of 88)" },
          steps: steps([["Reuse image from dev", "0s"], ["Roll out new version", "30s"], ["Health checks", "12s"], ["Run API tests", "2m 48s"], ["Auto-promote to prod"]], 3),
          logs: [log("FAIL test_share.py › rejects expired invites", "err")],
        },
        {
          id: "p2", env: "dev", message: "Add pantry sharing", sha: "7be20d1", version: "v0.9.4", triggeredBy: "Claude Code",
          status: "succeeded", createdAt: ago(14), durationSec: 96, from: "push to main",
          gate: { result: "passed", text: "Passed: unit tests (140/140)" },
          steps: steps([["Build app from main", "58s"], ["Run unit tests", "22s"], ["Roll out new version", "12s"], ["Health checks", "4s"]]),
          logs: [log("tests: 140 passed", "ok")],
        },
      ],
    }),
    simpleProject({
      id: "portfolio", repo: "senith/portfolio", framework: "Astro", domain: "senith.me", color: "#E85D9E", createdAt: "2026-06-20T08:00:00Z",
      envs: [
        { name: "dev", status: "healthy", version: "v2.1.0", sha: "19c03aa" },
        { name: "prod", status: "healthy", version: "v2.1.0", sha: "19c03aa" },
      ],
      deployments: [
        {
          id: "f1", env: "prod", message: "New case study", sha: "19c03aa", version: "v2.1.0", triggeredBy: "Senith (approved)",
          status: "succeeded", createdAt: ago(60 * 72), durationSec: 48, from: "dev",
          gate: { result: "passed", text: "Passed: manual approval" },
          steps: steps([["Reuse image from dev", "0s"], ["Roll out new version", "30s"], ["Health checks", "18s"]]),
          logs: [log("live at https://senith.me", "ok")],
        },
      ],
    }),
  ];
}

export const SEED_REPOS: Repo[] = [
  { fullName: "senith/lumen-notes", name: "lumen-notes", framework: "Next.js", updatedAt: ago(120), onHaven: true },
  { fullName: "senith/pantry-api", name: "pantry-api", framework: "FastAPI", updatedAt: ago(14), onHaven: true },
  { fullName: "senith/habit-tracker", name: "habit-tracker", framework: "SvelteKit", updatedAt: ago(60 * 24), onHaven: false },
  { fullName: "senith/recipe-bot", name: "recipe-bot", framework: "Node.js", updatedAt: ago(60 * 24 * 4), onHaven: false },
  { fullName: "senith/weekend-game", name: "weekend-game", framework: "Vite + React", updatedAt: ago(60 * 24 * 14), onHaven: false },
];
