variable "tunnel_name" {
  description = "Cloudflare tunnel name"
  type        = string
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

variable "services" {
  description = "List of services to expose through the tunnel"
  type = list(object({
    name    = string
    domain  = string
    service = string
  }))

  validation {
    condition     = length(var.services) == length(toset([for s in var.services : s.name]))
    error_message = "Each service.name must be unique."
  }
}

variable "access_policy_ids" {
  description = "Shared Zero Trust Access policy IDs for all services in this tunnel. If omitted or empty, no Access applications are created."
  type        = list(string)
  default     = null
  nullable    = true
}
