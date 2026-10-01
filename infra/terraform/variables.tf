variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
  default     = "69856462-2e0b-402b-bf7b-c9f41b3302a4"
}

variable "resource_group_name" {
  description = "Existing resource group to deploy into. Not created by this config."
  type        = string
  default     = "rg-osint-demo"
}

variable "name_prefix" {
  description = "Short prefix used to name/derive all resource names (ACR, plan, web app)."
  type        = string
  default     = "gev"
}

variable "acr_sku" {
  description = "Azure Container Registry SKU."
  type        = string
  default     = "Basic"
}

variable "app_service_plan_sku" {
  description = "App Service Plan SKU (Linux). B1 is the cheapest tier with always-on support."
  type        = string
  default     = "B1"
}

variable "image_tag" {
  description = "Container image tag to deploy from ACR (repository is always named after name_prefix)."
  type        = string
  default     = "latest"
}

# --- Secrets -----------------------------------------------------------
# All optional: the app degrades gracefully per-provider when a key is unset
# (see .env.example). Left empty by default so `terraform apply` works with
# no keys configured; fill via terraform.tfvars (gitignored) or TF_VAR_* env
# vars, never commit real values.

variable "google_maps_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "google_maps_server_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "cesium_ion_token" {
  type      = string
  default   = ""
  sensitive = true
}

variable "openai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "opensky_client_id" {
  type      = string
  default   = ""
  sensitive = true
}

variable "opensky_client_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "firms_map_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "aisstream_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "tomtom_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "ll2_api_token" {
  type      = string
  default   = ""
  sensitive = true
}

variable "app_settings_extra" {
  description = "Any additional app settings (e.g. CCTV_* toggles, OPENAI_REALTIME_MODEL overrides). Merged on top of the built-in settings, so entries here win on conflict."
  type        = map(string)
  default     = {}
}
