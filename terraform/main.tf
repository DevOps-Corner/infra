terraform {
  required_version = "~> 0.12.0"

  backend "remote" {
    organization = "eknert"
    workspaces {
      name = "infra"
    }
  }
}

provider "azurerm" {
  version = "~> 1.36"
}

provider "random" {
  version = "~> 2.2"
}

module "packer" {
  source = "./modules/matomo"
}

module "matomo" {
  source = "./modules/matomo"
}