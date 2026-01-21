output "domain" {
  description = "The domain name"
  value       = var.domain
}

output "jellyfin_tunnel_id" {
  description = "Tunnel ID for cloudflared config"
  value       = cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id
}

output "jellyfin_tunnel_token" {
  description = "Token for running cloudflared tunnel"
  value       = data.cloudflare_zero_trust_tunnel_cloudflared_token.jellyfin.token
  sensitive   = true
}

output "jellyfin_url" {
  description = "URL for Jellyfin"
  value       = "https://watch.${var.domain}"
}
