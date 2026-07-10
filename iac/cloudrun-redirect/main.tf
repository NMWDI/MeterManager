locals {
  # Env vars for schmunk42/nginx-redirect. Override with var.env for a different image.
  default_env = {
    SERVER_REDIRECT        = var.redirect_host
    SERVER_REDIRECT_SCHEME = var.redirect_scheme
    SERVER_REDIRECT_CODE   = tostring(var.redirect_code)
  }

  container_env = length(var.env) > 0 ? var.env : local.default_env
}

resource "google_cloud_run_v2_service" "redirect" {
  name     = var.service_name
  location = var.region

  # Public HTTP endpoint; browsers hit it directly.
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      ports {
        container_port = var.container_port
      }

      dynamic "env" {
        for_each = local.container_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
}

# Allow public (unauthenticated) access so the redirect is reachable.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = google_cloud_run_v2_service.redirect.project
  location = google_cloud_run_v2_service.redirect.location
  name     = google_cloud_run_v2_service.redirect.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
