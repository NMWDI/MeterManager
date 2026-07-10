variable "project_id" {
  type        = string
  description = "GCP project ID to deploy the redirect service into."
}

variable "region" {
  type        = string
  description = "Cloud Run region."
  default     = "us-central1"
}

variable "service_name" {
  type        = string
  description = "Name of the Cloud Run service."
  default     = "metermanager-redirect"
}

variable "image" {
  type        = string
  description = <<-EOT
    Prebuilt redirect container image. Cloud Run supports images from
    Artifact Registry, Container Registry, and public Docker Hub.
    Default is schmunk42/nginx-redirect, which 301s $scheme://$host$request_uri
    (path + query preserved) and listens on port 80.
  EOT
  default     = "docker.io/schmunk42/nginx-redirect:latest"
}

variable "container_port" {
  type        = number
  description = "Port the redirect image listens on (schmunk42/nginx-redirect uses 80)."
  default     = 80
}

variable "redirect_host" {
  type        = string
  description = "Canonical host to redirect every request to."
  default     = "metermanager.pvacd.com"
}

variable "redirect_scheme" {
  type        = string
  description = "Scheme of the redirect target."
  default     = "https"
}

variable "redirect_code" {
  type        = number
  description = "HTTP redirect status code (301 permanent / 302 temporary)."
  default     = 301
}

variable "env" {
  type        = map(string)
  description = <<-EOT
    Optional override of container env vars. When empty, env vars are derived
    from redirect_host/redirect_scheme/redirect_code for schmunk42/nginx-redirect.
    Set this if you swap `image` for one expecting different env var names.
  EOT
  default     = {}
}

variable "allow_unauthenticated" {
  type        = bool
  description = "Grant allUsers roles/run.invoker so browsers can reach the redirect. Required for a public redirect."
  default     = true
}

variable "min_instances" {
  type        = number
  description = "Minimum Cloud Run instances (0 = scale to zero)."
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Maximum Cloud Run instances."
  default     = 2
}
