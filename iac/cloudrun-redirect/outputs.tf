output "service_name" {
  description = "Cloud Run service name."
  value       = google_cloud_run_v2_service.redirect.name
}

output "service_url" {
  description = "Auto-assigned run.app URL of the redirect service. Point DNS (CNAME / domain mapping) at this, or verify redirect here directly."
  value       = google_cloud_run_v2_service.redirect.uri
}
