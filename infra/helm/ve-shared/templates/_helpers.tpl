{{/*
Common labels for ve-shared resources.
*/}}
{{- define "ve-shared.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: vista-evolved
app.kubernetes.io/component: shared
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
{{- end }}

{{/*
Selector labels for a named component.
*/}}
{{- define "ve-shared.selectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .release }}
{{- end }}

{{/*
Full image reference helper.
*/}}
{{- define "ve-shared.image" -}}
{{- if .global.imageRegistry -}}
{{ .global.imageRegistry }}/{{ .repository }}:{{ .tag }}
{{- else -}}
{{ .repository }}:{{ .tag }}
{{- end -}}
{{- end }}
