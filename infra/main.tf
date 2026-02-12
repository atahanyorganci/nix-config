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

# Read Doppler configuration from doppler.yaml
locals {
  doppler_config      = yamldecode(file("${path.module}/doppler.yaml"))
  doppler_setup       = local.doppler_config.setup[0]
  doppler_project     = local.doppler_setup.project
  doppler_config_name = local.doppler_setup.config
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "doppler" {
  doppler_token = var.doppler_token
}

module "media_tunnel" {
  source = "./modules/cloudflare_tunnel"

  tunnel_name           = "jellyfin"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  services = [
    {
      name    = "jellyfin"
      domain  = "watch.${var.domain}"
      service = "http://localhost:8096"
    }
  ]
}

module "arr_stack_tunnel" {
  source = "./modules/cloudflare_tunnel"

  tunnel_name           = "arr-stack"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  access_policy_ids     = [cloudflare_zero_trust_access_policy.allow_emails.id]
  services = [
    {
      name    = "transmission"
      domain  = "download.${var.domain}"
      service = "http://localhost:9091"
    },
    {
      name    = "radarr"
      domain  = "film.${var.domain}"
      service = "http://localhost:7878"
    },
    {
      name    = "sonarr"
      domain  = "tv.${var.domain}"
      service = "http://localhost:8989"
    },
    {
      name    = "prowlarr"
      domain  = "indexer.${var.domain}"
      service = "http://localhost:9696"
    },
    {
      name    = "calibre_web"
      domain  = "library.${var.domain}"
      service = "http://localhost:8083"
    }
  ]
}


module "dokploy_tunnel" {
  source = "./modules/cloudflare_tunnel"

  tunnel_name           = "dokploy-tunnel"
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  services = [
    {
      name    = "dokploy"
      domain  = "dokploy.${var.domain}"
      service = "http://localhost:3000"

    },
    {
      name    = "dokploy-http"
      domain  = "*.${var.domain}"
      service = "http://127.0.0.1:80"
    }
  ]
}

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

resource "doppler_secret" "media_tunnel_token" {
  project = local.doppler_project
  config  = local.doppler_config_name
  name    = "MEDIA_TUNNEL_TOKEN"
  value   = module.media_tunnel.tunnel_token
}

resource "doppler_secret" "arr_stack_tunnel_token" {
  project = local.doppler_project
  config  = local.doppler_config_name
  name    = "ARR_STACK_TUNNEL_TOKEN"
  value   = module.arr_stack_tunnel.tunnel_token
}

resource "doppler_secret" "dokploy_tunnel_token" {
  project = local.doppler_project
  config  = local.doppler_config_name
  name    = "DOKPLOY_TUNNEL_TOKEN"
  value   = module.dokploy_tunnel.tunnel_token
}
