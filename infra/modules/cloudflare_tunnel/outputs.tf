output "tunnel_id" {
  description = "Cloudflare tunnel ID"
  value       = cloudflare_zero_trust_tunnel_cloudflared.this.id
}

output "tunnel_token" {
  description = "Cloudflare tunnel token"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.this.token
  sensitive   = true
}

output "service_urls" {
  description = "Service URLs keyed by service name"
  value = {
    for s in var.services : s.name => "https://${s.domain}"
  }
}

output "tunnel_cname_target" {
  description = "Tunnel CNAME target"
  value       = "${cloudflare_zero_trust_tunnel_cloudflared.this.id}.cfargotunnel.com"
}
