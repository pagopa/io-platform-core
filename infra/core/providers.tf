terraform {
  required_version = ">= 1.14.7"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
  subscription_id     = "ec285037-c673-4f58-b594-d7c480da4e8b"
}

terraform {
  backend "azurerm" {
    resource_group_name  = "io-p-itn-tfstate-rg-01"
    storage_account_name = "iopitntfstatest01"
    container_name       = "terraform-state"
    key                  = "io-platform-core.core.prod.tfstate"
    subscription_id      = "ec285037-c673-4f58-b594-d7c480da4e8b"
    use_azuread_auth     = true
  }
}
