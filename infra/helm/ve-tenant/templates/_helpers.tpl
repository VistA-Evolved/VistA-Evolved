{{/*
Compute effective tenant namespace.
*/}}
{{- define "ve-tenant.namespace" -}}
{{- .Values.tenantNamespace | default (printf "ve-tenant-%s" .Values.tenantSlug) -}}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "ve-tenant.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: vista-evolved
app.kubernetes.io/component: tenant
vista-evolved/tenant-id: {{ .Values.tenantId | quote }}
vista-evolved/tenant-slug: {{ .Values.tenantSlug | quote }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{/*
Full image reference.
*/}}
{{- define "ve-tenant.image" -}}
{{- if .global -}}
{{- if .global.imageRegistry -}}
{{ .global.imageRegistry }}/{{ .repository }}:{{ .tag }}
{{- else -}}
{{ .repository }}:{{ .tag }}
{{- end -}}
{{- else -}}
{{ .repository }}:{{ .tag }}
{{- end -}}
{{- end }}
