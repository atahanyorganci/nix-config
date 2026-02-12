terraform {
  required_providers {
    cloudflare = {
      source = "cloudflare/cloudflare"
    }
  }
}

resource "cloudflare_zero_trust_tunnel_cloudflared" "this" {
  account_id = var.cloudflare_account_id
  name       = var.tunnel_name
  config_src = "cloudflare"
}

data "cloudflare_zero_trust_tunnel_cloudflared_token" "this" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.this.id
}

locals {
  effective_access_policy_ids = coalesce(var.access_policy_ids, [])

  ingress_rules = concat(
    [for s in var.services : {
      hostname = s.domain
      service  = s.service
    }],
    [{
      service = "http_status:404"
    }]
  )

  services_by_name = {
    for s in var.services : s.name => s
  }

}

resource "cloudflare_zero_trust_tunnel_cloudflared_config" "this" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_zero_trust_tunnel_cloudflared.this.id
  config = {
    ingress = local.ingress_rules
  }
}

resource "cloudflare_dns_record" "services" {
  for_each = local.services_by_name

  zone_id = var.cloudflare_zone_id
  name    = each.value.domain
  content = "${cloudflare_zero_trust_tunnel_cloudflared.this.id}.cfargotunnel.com"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_zero_trust_access_application" "services" {
  for_each = length(local.effective_access_policy_ids) > 0 ? local.services_by_name : {}

  account_id = var.cloudflare_account_id
  type       = "self_hosted"
  name       = replace(title(replace(each.value.name, "_", " ")), " ", "-")
  domain     = each.value.domain
  policies = [
    for idx, policy_id in local.effective_access_policy_ids : {
      id         = policy_id
      precedence = idx + 1
    }
  ]
}
