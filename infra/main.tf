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
    doppler = {
      source  = "DopplerHQ/doppler"
      version = "~> 1"
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

# Tunnel configuration - routes services to local ports
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
        hostname = "download.${var.domain}"
        service  = "http://localhost:9091"
      },
      {
        hostname = "film.${var.domain}"
        service  = "http://localhost:7878"
      },
      {
        hostname = "tv.${var.domain}"
        service  = "http://localhost:8989"
      },
      {
        hostname = "indexer.${var.domain}"
        service  = "http://localhost:9696"
      },
      {
        service = "http_status:404"
      }
    ]
  }
}

# DNS CNAME records pointing to the tunnel
resource "cloudflare_dns_record" "jellyfin" {
  zone_id = var.cloudflare_zone_id
  name    = "watch"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "transmission" {
  zone_id = var.cloudflare_zone_id
  name    = "download"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "radarr" {
  zone_id = var.cloudflare_zone_id
  name    = "film"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "sonarr" {
  zone_id = var.cloudflare_zone_id
  name    = "tv"
  content = "${cloudflare_zero_trust_tunnel_cloudflared.jellyfin.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_dns_record" "prowlarr" {
  zone_id = var.cloudflare_zone_id
  name    = "indexer"
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

# Access applications
resource "cloudflare_zero_trust_access_application" "transmission" {
  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = "Transmission"
  domain     = "download.${var.domain}"
  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.allow_emails.id
      precedence = 1
    }
  ]
}

resource "cloudflare_zero_trust_access_application" "radarr" {
  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = "Radarr"
  domain     = "film.${var.domain}"
  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.allow_emails.id
      precedence = 1
    }
  ]
}

resource "cloudflare_zero_trust_access_application" "sonarr" {
  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = "Sonarr"
  domain     = "tv.${var.domain}"
  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.allow_emails.id
      precedence = 1
    }
  ]
}

resource "cloudflare_zero_trust_access_application" "prowlarr" {
  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = "Prowlarr"
  domain     = "indexer.${var.domain}"
  policies = [
    {
      id         = cloudflare_zero_trust_access_policy.allow_emails.id
      precedence = 1
    }
  ]
}
