module "azure-PROD-IO_bootstrap" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 3.0"

  providers = {
    azurerm = azurerm.PROD-IO
  }

  environment = merge(local.environment, local.azure_accounts.PROD-IO)

  subscription_id = data.azurerm_subscription.PROD_IO.id
  tenant_id       = data.azurerm_subscription.PROD_IO.tenant_id

  entraid_groups = {
    admins_object_id    = data.azuread_group.admins.object_id
    devs_object_id      = data.azuread_group.developers.object_id
    externals_object_id = data.azuread_group.externals.object_id
  }

  terraform_storage_account = {
    name                = "iopitntfstatest01"
    resource_group_name = "io-p-itn-tfstate-rg-01"
  }

  repository = {
    owner = "pagopa"
    name  = "io-platform-core"
  }

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner.id
    container_app_environment_location = data.azurerm_container_app_environment.runner.location
    key_vault = {
      name                = data.azurerm_key_vault.common.name
      resource_group_name = data.azurerm_key_vault.common.resource_group_name
    }
    use_github_app = true
  }

  apim_id                            = data.azurerm_api_management.apim.id
  pep_vnet_id                        = data.azurerm_virtual_network.common.id
  private_dns_zone_resource_group_id = data.azurerm_resource_group.common_weu.id
  nat_gateway_resource_group_id      = data.azurerm_resource_group.common_itn_01.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards.id

  tags = local.tags
}