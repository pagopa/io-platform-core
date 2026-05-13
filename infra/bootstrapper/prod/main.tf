module "azure-PROD-IO_bootstrap" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 4.0"

  providers = {
    azurerm = azurerm.PROD-IO
  }

  environment = merge(local.environment, local.azure_accounts.PROD-IO)

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
    container_app_environment_id = data.azurerm_container_app_environment.runner.id
    key_vault = {
      name                = data.azurerm_key_vault.common.name
      resource_group_name = data.azurerm_key_vault.common.resource_group_name
      use_rbac            = true
    }
    use_github_app = true
  }

  private_dns_zone_resource_group_id = data.azurerm_resource_group.common_weu.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards.id

  tags = local.tags
}
