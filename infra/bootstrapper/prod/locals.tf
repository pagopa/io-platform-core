locals {
  environment = {
    prefix          = "io"
    env_short       = "p"
    domain          = ""
    instance_number = "01"
  }

  azure_accounts = {
    PROD-IO = {
      location = "italynorth"
    }
  }

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    CostCenter     = "TS000"
    BusinessUnit   = "App IO"
    ManagementTeam = "IO Platform"
  }
}