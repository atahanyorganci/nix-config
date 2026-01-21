terraform {
  required_version = ">= 1.0"
  backend "s3" {
    key                         = "home-server/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Cloudflare Tunnel for Jellyfin
resource "cloudflare_zero_trust_tunnel_cloudflared" "jellyfin" {
  account_id = var.cloudflare_account_id
  name       = "jellyfin"
  config_src = "cloudflare"
}

# Tunnel token for running cloudflared
data "cloudflare_zero_trust_tunnel_cloudflared_token" "jellyfin" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id
}

# Tunnel configuration - routes watch.<domain> to local Jellyfin
resource "cloudflare_zero_trust_tunnel_cloudflared_config" "jellyfin" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id
  config = {
    ingress = [
      {
        hostname = "watch.${var.domain}"
        service  = "http://localhost:8096"
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

# DNS CNAME record pointing to the tunnel
resource "cloudflare_dns_record" "jellyfin" {
  zone_id = var.cloudflare_zone_id
  name    = "watch"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

# Reusable Access policy
resource "cloudflare_zero_trust_access_policy" "allow_emails" {
  account_id = var.cloudflare_account_id
  name       = "Allow email addresses"
  decision   = "allow"
  include = [
    {
      email = {
        email = "atahanyorganci@hotmail.com"
      }
    },
    {
      email_domain = {
        domain = "yorganci.dev"
      }
    }
  ]
}

# Access application for Jellyfin
resource "cloudflare_zero_trust_access_application" "jellyfin" {
  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = "Jellyfin"
  domain     = "watch.${var.domain}"
  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.allow_emails.id
      precedence = 1
    }
  ]
}
