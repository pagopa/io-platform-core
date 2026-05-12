data "azuread_group" "admins" {
  display_name = "io-p-adgroup-platform-admins"
}

data "azuread_group" "developers" {
  display_name = "io-p-adgroup-platform-developers"
}

data "azuread_group" "externals" {
  display_name = "io-p-adgroup-platform-externals"
}

data "azurerm_resource_group" "common_itn_01" {
  provider = azurerm.PROD-IO
  name     = "io-p-itn-common-rg-01"
}

data "azurerm_resource_group" "common_weu" {
  provider = azurerm.PROD-IO
  name     = "io-p-rg-common"
}

data "azurerm_resource_group" "dashboards" {
  provider = azurerm.PROD-IO
  name     = "dashboards"
}

data "azurerm_container_app_environment" "runner" {
  provider            = azurerm.PROD-IO
  name                = "io-p-itn-github-runner-cae-01"
  resource_group_name = "io-p-itn-github-runner-rg-01"
}

data "azurerm_key_vault" "common" {
  provider            = azurerm.PROD-IO
  name                = "io-p-itn-common-kv-01"
  resource_group_name = data.azurerm_resource_group.common_itn_01.name
}
