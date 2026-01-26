variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "domain" {
  description = "Domain name"
  type        = string
}

variable "doppler_token" {
  description = "Doppler API token for authentication"
  type        = string
  sensitive   = true
}
