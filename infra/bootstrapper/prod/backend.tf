terraform {
  backend "azurerm" {
    resource_group_name  = "io-p-itn-tfstate-rg-01"
    storage_account_name = "iopitntfstatest01"
    container_name       = "terraform-state"
    key                  = "io-platform-core.bootstrapper.prod.tfstate"
    subscription_id      = "ec285037-c673-4f58-b594-d7c480da4e8b"
    use_azuread_auth     = true
  }
}