"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api/client";
import type { CreateProjectInput, OAuthProvider, SignInInput, SignUpInput } from "./api/types";

export const queryKeys = {
  cluster: ["cluster"] as const,
  repos: ["repos"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  pipeline: (id: string) => ["projects", id, "pipeline"] as const,
  deployments: (id: string) => ["projects", id, "deployments"] as const,
  environments: (id: string) => ["projects", id, "environments"] as const,
  hvnYaml: (id: string) => ["projects", id, "hvn-yaml"] as const,
  observability: (id: string, env: string) => ["projects", id, "observability", env] as const,
  agents: (id: string) => ["projects", id, "agents"] as const,
  session: ["session"] as const,
};

// ---------- Reads ----------

export const useCluster = () => useQuery({ queryKey: queryKeys.cluster, queryFn: api.getCluster });

export const useRepos = () => useQuery({ queryKey: queryKeys.repos, queryFn: api.listRepos });

export const useProjects = () => useQuery({ queryKey: queryKeys.projects, queryFn: api.listProjects });

export const useProject = (id: string) =>
  useQuery({ queryKey: queryKeys.project(id), queryFn: () => api.getProject(id) });

export const usePipeline = (id: string) =>
  useQuery({ queryKey: queryKeys.pipeline(id), queryFn: () => api.getPipeline(id) });

export const useDeployments = (id: string) =>
  useQuery({ queryKey: queryKeys.deployments(id), queryFn: () => api.listDeployments(id) });

export const useEnvironments = (id: string) =>
  useQuery({ queryKey: queryKeys.environments(id), queryFn: () => api.listEnvironments(id) });

export const useHvnYaml = (id: string) =>
  useQuery({ queryKey: queryKeys.hvnYaml(id), queryFn: () => api.getHvnYaml(id) });

export const useObservability = (id: string, env: string) =>
  useQuery({
    queryKey: queryKeys.observability(id, env),
    queryFn: () => api.getObservability(id, env),
    enabled: Boolean(env),
    refetchInterval: 30_000,
  });

export const useAgents = (id: string) =>
  useQuery({ queryKey: queryKeys.agents(id), queryFn: () => api.listAgents(id) });

// ---------- Mutations ----------

/** Invalidates everything under a project plus the projects list, which shows derived status. */
function useInvalidateProject() {
  const qc = useQueryClient();
  return (id: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.project(id) }),
      qc.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
    ]);
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.createProject(input),
    onSuccess: (project) => {
      qc.setQueryData(queryKeys.project(project.id), project);
      return Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
        qc.invalidateQueries({ queryKey: queryKeys.repos }),
      ]);
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    // The deleted project's own queries are left alone: removing them while its page is
    // still mounted would refetch and flash "not found" before the redirect lands.
    onSuccess: () => {
      return Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.projects, exact: true }),
        qc.invalidateQueries({ queryKey: queryKeys.repos }),
      ]);
    },
  });
}

export function useUpdateDomain(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (domain: string) => api.updateDomain(id, domain),
    onSuccess: () => invalidate(id),
  });
}

export function useAcceptPromotion(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (deploymentId: string) => api.acceptPromotion(id, deploymentId),
    onSuccess: () => invalidate(id),
  });
}

export function useRejectPromotion(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (deploymentId: string) => api.rejectPromotion(id, deploymentId),
    onSuccess: () => invalidate(id),
  });
}

export function useRedeploy(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (env: string) => api.redeploy(id, env),
    onSuccess: () => invalidate(id),
  });
}

export function useRollback(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: (deploymentId: string) => api.rollback(id, deploymentId),
    onSuccess: () => invalidate(id),
  });
}

export function useUpdateHostname(id: string) {
  const invalidate = useInvalidateProject();
  return useMutation({
    mutationFn: ({ env, hostname }: { env: string; hostname: string }) => api.updateHostname(id, env, hostname),
    onSuccess: () => invalidate(id),
  });
}

export function useRevokeAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => api.revokeAgent(id, agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents(id) }),
  });
}

// ---------- Auth ----------

export const useSession = () => useQuery({ queryKey: queryKeys.session, queryFn: api.getSession });

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SignInInput) => api.signIn(input),
    onSuccess: (session) => qc.setQueryData(queryKeys.session, session),
  });
}

export function useSignInWithProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: OAuthProvider) => api.signInWithProvider(provider),
    onSuccess: (session) => qc.setQueryData(queryKeys.session, session),
  });
}

export const useSignUp = () => useMutation({ mutationFn: (input: SignUpInput) => api.signUp(input) });

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.signOut,
    // Nothing cached belongs to the next person who signs in.
    onSuccess: () => qc.clear(),
  });
}

export const useRequestPasswordReset = () => useMutation({ mutationFn: (email: string) => api.requestPasswordReset(email) });

export const useResendVerification = () => useMutation({ mutationFn: (email: string) => api.resendVerification(email) });
