resource "azurerm_resource_group" "packer" {
  name     = "packer"
  location = var.region

  tags = {
    environment = var.environment
    terraform   = true
  }
}