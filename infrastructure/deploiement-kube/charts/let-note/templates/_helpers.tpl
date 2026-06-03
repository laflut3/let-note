{{- define "let-note.namespace" -}}
{{ .Release.Namespace | default .Values.global.environment }}
{{- end }}

{{- define "let-note.image" -}}
{{- $image := . -}}
{{- if $image.digest -}}
{{ printf "%s:%s@%s" $image.repository $image.tag $image.digest }}
{{- else -}}
{{ printf "%s:%s" $image.repository $image.tag }}
{{- end -}}
{{- end }}

{{- define "let-note.commonLabels" -}}
app.kubernetes.io/part-of: let-note
app.kubernetes.io/managed-by: Helm
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | quote }}
{{- end }}

{{- define "let-note.appConfig" -}}
app:
  name: {{ .Values.config.app.name }}
  env: {{ .Values.config.app.env }}
routes:
  frontend_base_url: {{ .Values.config.app.routes.frontendBaseUrl }}
  backend_base_url: {{ .Values.config.app.routes.backendBaseUrl }}
  health_path: {{ .Values.config.app.routes.healthPath }}
  auth:
    login_path: {{ .Values.config.app.routes.auth.loginPath }}
    logout_path: {{ .Values.config.app.routes.auth.logoutPath }}
ingress:
  host: {{ .Values.config.app.ingress.host }}
  frontend_path: {{ .Values.config.app.ingress.frontendPath }}
  api_path: {{ .Values.config.app.ingress.apiPath }}
cors:
  allowed_origins:
{{- range .Values.config.app.cors.allowedOrigins }}
    - {{ . }}
{{- end }}
{{- end }}
