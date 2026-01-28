output "tunnel" {
  description = "Cloudflare tunnel details"
  value = {
    id    = cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id
    token = data.cloudflare_zero_trust_tunnel_cloudflared_token.jellyfin.token
  }
  sensitive = true
}

output "services" {
  description = "Service URLs"
  value = {
    jellyfin     = "https://watch.${var.domain}"
    transmission = "https://download.${var.domain}"
    radarr       = "https://film.${var.domain}"
    sonarr       = "https://tv.${var.domain}"
    prowlarr     = "https://indexer.${var.domain}"
    calibre_web  = "https://library.${var.domain}"
  }
}
