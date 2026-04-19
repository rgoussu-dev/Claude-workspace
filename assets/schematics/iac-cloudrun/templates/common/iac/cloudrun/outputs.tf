output "service_url" {
  value       = google_cloud_run_v2_service.app.uri
  description = "Public HTTPS URL for the Cloud Run service."
}
