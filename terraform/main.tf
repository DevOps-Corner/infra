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

resource "azurerm_resource_group" "rg" {
  name     = "test"
  location = var.region

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_virtual_network" "vn" {
  name                = "test"
  address_space       = ["10.0.0.0/16"]
  location            = var.region
  resource_group_name = azurerm_resource_group.rg.name

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_subnet" "subnet" {
  name                 = "test"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vn.name
  address_prefix       = "10.0.2.0/24"

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_public_ip" "publicip" {
  name                = "test"
  location            = var.region
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Dynamic"

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_network_security_group" "nsg" {
  name                = "test"
  location            = var.region
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_network_interface" "nic" {
  name                      = "test"
  location                  = var.region
  resource_group_name       = azurerm_resource_group.rg.name
  network_security_group_id = azurerm_network_security_group.nsg.id

  ip_configuration {
    name                          = "test"
    subnet_id                     = azurerm_subnet.subnet.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.publicip.id
  }

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "random_id" "random" {
  keepers = {
    # Generate a new ID only when a new resource group is defined
    resource_group = azurerm_resource_group.rg.name
  }

  byte_length = 8

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_storage_account" "storageaccount" {
  name                     = "diag${random_id.random.hex}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = var.region
  account_replication_type = "LRS"
  account_tier             = "Standard"

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_managed_disk" "managed_disk_1" {
  name                 = "disk1"
  location             = var.region
  resource_group_name  = azurerm_resource_group.rg.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = "64"

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_managed_disk" "managed_disk_2" {
  name                 = "disk2"
  location             = var.region
  resource_group_name  = azurerm_resource_group.rg.name
  storage_account_type = "Premium_LRS"
  create_option        = "Copy"
  source_resource_id   = azurerm_managed_disk.managed_disk_1.id
  disk_size_gb         = "64"

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_container_registry" "acr" {
  name                = "eknert"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.region
  sku                 = "Standard"
  admin_enabled       = false

  tags = {
    environment = var.environment
    terraform = true
  }
}

resource "azurerm_virtual_machine" "vm" {
  name                  = "test"
  location              = var.region
  resource_group_name   = azurerm_resource_group.rg.name
  network_interface_ids = [azurerm_network_interface.nic.id]
  vm_size               = "Standard_B1S"

  storage_os_disk {
    name              = "test"
    caching           = "ReadWrite"
    create_option     = "FromImage"
    managed_disk_type = "Premium_LRS"
  }

  storage_image_reference {
    publisher = "Canonical"
    offer     = "UbuntuServer"
    sku       = "18.04-LTS"
    version   = "latest"
  }

  os_profile {
    computer_name  = "vm"
    admin_username = "andekn"
  }

  os_profile_linux_config {
    disable_password_authentication = true
    ssh_keys {
      path     = "/home/andekn/.ssh/authorized_keys"
      key_data = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCrXDF/ZbjECk7h+BI8nys6mWdbDvnJALXQfdDUnERkV2Vx6+3TaYrudRmcdQhqYi/KPulAl0NASYw4avdKzaRDUlbp51A4A98vL7fr1fgfyyShJRlhfeNqMA01fP2YA8ZTXgGwvRgF8hbfrbASn0oyv1o3qspAggLAtPVh9ad5W8IalKSfe+kFcVqaA72WJjRBsPosieRFHF1mTp7sk0/L8Kra6nwaqYNkxypa8YSIw7jwDaNhpFvwChZpjy2CvyqQ/KPjtTS7sK/E5505hpeWaz+Z428htdJG565l0FQ+U2M8OCDkckV75mFwSOZTlYXRi+0tF3m/bU601kiRRgcX"
    }
  }

  boot_diagnostics {
    enabled     = "true"
    storage_uri = azurerm_storage_account.storageaccount.primary_blob_endpoint
  }

  tags = {
    environment = var.environment
    terraform = true
  }
}