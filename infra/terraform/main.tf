data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

# Suffix for globally-unique names (ACR name, web app hostname).
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_container_registry" "acr" {
  name                = "${var.name_prefix}acr${random_string.suffix.result}"
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location
  sku                 = var.acr_sku
  admin_enabled       = false
}

resource "azurerm_service_plan" "plan" {
  name                = "${var.name_prefix}-plan"
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location
  os_type             = "Linux"
  sku_name            = var.app_service_plan_sku
}

locals {
  # Matches the repo's Dockerfile (build/vite.js): vite preview binds here.
  base_app_settings = {
    HOST          = "0.0.0.0"
    PORT          = "8080"
    WEBSITES_PORT = "8080"
  }

  secret_app_settings = {
    GOOGLE_MAPS_API_KEY        = var.google_maps_api_key
    GOOGLE_MAPS_SERVER_API_KEY = var.google_maps_server_api_key
    CESIUM_ION_TOKEN           = var.cesium_ion_token
    OPENAI_API_KEY             = var.openai_api_key
    OPENSKY_CLIENT_ID          = var.opensky_client_id
    OPENSKY_CLIENT_SECRET      = var.opensky_client_secret
    FIRMS_MAP_KEY              = var.firms_map_key
    AISSTREAM_API_KEY          = var.aisstream_api_key
    TOMTOM_API_KEY             = var.tomtom_api_key
    LL2_API_TOKEN              = var.ll2_api_token
  }

  app_settings = merge(local.base_app_settings, local.secret_app_settings, var.app_settings_extra)

  # Free (F1) and Shared (D1) tiers reject `always_on = true` at apply time.
  always_on = !contains(["F1", "D1"], upper(var.app_service_plan_sku))
}

resource "azurerm_linux_web_app" "app" {
  name                = "${var.name_prefix}-${random_string.suffix.result}"
  resource_group_name = data.azurerm_resource_group.this.name
  location            = data.azurerm_resource_group.this.location
  service_plan_id     = azurerm_service_plan.plan.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    always_on                               = local.always_on
    container_registry_use_managed_identity = true

    application_stack {
      docker_image_name   = "${var.name_prefix}:${var.image_tag}"
      docker_registry_url = "https://${azurerm_container_registry.acr.login_server}"
    }
  }

  app_settings = local.app_settings

  lifecycle {
    # A CI/CD pipeline pushing new tags via `az webapp config container set`
    # (or the ACR webhook / continuous deployment) shouldn't be reverted by
    # the next `terraform apply`. Remove this if Terraform should own the tag.
    ignore_changes = [
      site_config[0].application_stack[0].docker_image_name,
    ]
  }
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_linux_web_app.app.identity[0].principal_id
}
