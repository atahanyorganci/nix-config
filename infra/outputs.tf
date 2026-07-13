output "media_tunnel" {
  description = "Cloudflare tunnel details"
  value       = module.media_tunnel
  sensitive   = true
}

output "arr_stack_tunnel" {
  description = "Cloudflare tunnel details"
  value       = module.arr_stack_tunnel
  sensitive   = true
}
