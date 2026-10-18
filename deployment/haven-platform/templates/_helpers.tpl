{{/*
Labels shared by every resource in the chart.
*/}}
{{- define "haven.commonLabels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/part-of: haven
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
{{- end -}}

{{/*
Name of the hvnK8sManager resources. Kubernetes names must be lowercase DNS labels
of at most 63 characters, so the release name is truncated if needed.
*/}}
{{- define "haven.hvnK8sManager.fullname" -}}
{{- printf "%s-hvn-k8s-manager" .Release.Name | lower | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Selector labels for hvnK8sManager. These are immutable on a Deployment once created,
so keep them stable.
*/}}
{{- define "haven.hvnK8sManager.selectorLabels" -}}
app.kubernetes.io/name: hvn-k8s-manager
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Name for cluster-scoped resources (ClusterRole/ClusterRoleBinding). These are unique across the
whole cluster, so the namespace is included to avoid clashes between same-named releases.
*/}}
{{- define "haven.hvnK8sManager.clusterName" -}}
{{- printf "%s-%s-hvn-k8s-manager" .Release.Namespace .Release.Name | lower | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "haven.hvnK8sManager.namespace" -}}
{{- .Release.Namespace -}}
{{- end -}}

{{- define "haven.hvnK8sManager.labels" -}}
{{ include "haven.commonLabels" . }}
{{ include "haven.hvnK8sManager.selectorLabels" . }}
app.kubernetes.io/component: k8s-manager
{{- end -}}
