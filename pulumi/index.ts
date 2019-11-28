import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure"
import * as random from "@pulumi/random"
import { NetworkSecurityGroup } from "@pulumi/azure/network"

const defaultTags = { environment: "test", pulumi: "true" }

const resourceGroup = new azure.core.ResourceGroup("resourceGroup")

const storageAccount = new azure.storage.Account("storage", {
    resourceGroupName: resourceGroup.name,
    accountTier: "Standard",
    accountReplicationType: "LRS",
})

const virtualNetwork = new azure.network.VirtualNetwork("vn", {
    resourceGroupName: resourceGroup.name,
    addressSpaces: ["10.0.0.0/16"],
    tags: defaultTags,
})

const subnet = new azure.network.Subnet("subnet", {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: virtualNetwork.name,
    addressPrefix: "10.0.2.0/24",
})

const publicIp = new azure.network.PublicIp("publicip", {
    resourceGroupName: resourceGroup.name,
    allocationMethod: "Dynamic",
    tags: defaultTags,
})

const securityGroup = new azure.network.NetworkSecurityGroup("securityGroup", {
    resourceGroupName: resourceGroup.name,
    securityRules: [
        {
            name: "SSH",
            priority: 1001,
            direction: "Inbound",
            access: "Allow",
            protocol: "Tcp",
            sourcePortRange: "*",
            destinationPortRange: "22",
            sourceAddressPrefix: "*",
            destinationAddressPrefix: "*",
        },
    ],
    tags: defaultTags,
})

const networkInterface = new azure.network.NetworkInterface(
    "networkInterface",
    {
        resourceGroupName: resourceGroup.name,
        networkSecurityGroupId: securityGroup.id,
        ipConfigurations: [
            {
                name: "ip-addr",
                publicIpAddressId: publicIp.id,
                privateIpAddressAllocation: "Dynamic",
                subnetId: subnet.id,
            },
        ],
        tags: defaultTags,
    }
)

// Could be used to create semi-random names like "diag${random_id.random.hex}"
const randomId = new random.RandomId("random", {
    keepers: [
        {
            resourceGroup: resourceGroup.name,
        },
    ],
    byteLength: 8,
})

//  # Requires the image to have been built by packer beforehand
//  data "azurerm_image" "images" {
//    name                = "ubuntu-matomo"
//    resource_group_name = var.resource_group
//  }

//   resource "azurerm_managed_disk" "mdisk2" {
//     name                 = "disk2"
//     location             = var.region
//     resource_group_name  = var.resource_group
//     storage_account_type = "Premium_LRS"
//     create_option        = "Empty"
//     disk_size_gb         = "64"

//     tags = {
//       environment = var.environment
//       terraform   = true
//     }
//   }

// Requires the image to have been built by packer beforehand
// data "azurerm_image" "images" {
//  name                = "ubuntu-matomo"
//  resource_group_name = var.resource_group
// }

const matomoMachine = new azure.compute.VirtualMachine("matomo-vm", {
    name: "matomo",
    resourceGroupName: resourceGroup.name,
    networkInterfaceIds: [networkInterface.id],
    vmSize: "Standard_B1S",
    storageOsDisk: {
        name: "matomo-os-disk",
        createOption: "FromImage",
        caching: "ReadWrite",
        managedDiskType: "Premium_LRS",
        diskSizeGb: 64,
    },
    // TODO
    //storageImageReference: {
    // TODO: Use variable, and should be same for packer and terraform
    // id: data.azurerm_image.images.id
    //},
    osProfile: {
        computerName: "matomo",
        adminUsername: "andekn",
    },
    osProfileLinuxConfig: {
        disablePasswordAuthentication: true,
        sshKeys: [
            {
                path: "/home/andekn/.ssh/authorized_keys",
                keyData:
                    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCrXDF/ZbjECk7h+BI8nys6mWdbDvnJALXQfdDUnERkV2Vx6+3TaYrudRmcdQhqYi/KPulAl0NASYw4avdKzaRDUlbp51A4A98vL7fr1fgfyyShJRlhfeNqMA01fP2YA8ZTXgGwvRgF8hbfrbASn0oyv1o3qspAggLAtPVh9ad5W8IalKSfe+kFcVqaA72WJjRBsPosieRFHF1mTp7sk0/L8Kra6nwaqYNkxypa8YSIw7jwDaNhpFvwChZpjy2CvyqQ/KPjtTS7sK/E5505hpeWaz+Z428htdJG565l0FQ+U2M8OCDkckV75mFwSOZTlYXRi+0tF3m/bU601kiRRgcX",
            },
        ],
    },
    bootDiagnostics: {
        enabled: true,
        storageUri: storageAccount.primaryBlobEndpoint,
    },
    tags: defaultTags,
})

// Create an Azure function that prints a message and the request headers.
async function handler(
    context: azure.appservice.Context<azure.appservice.HttpResponse>,
    request: azure.appservice.HttpRequest
) {
    let body = ""
    const headers = request.headers
    for (const h of Object.keys(request.headers)) {
        body = body + `${h} = ${headers[h]}\n`
    }

    return {
        status: 200,
        headers: {
            "content-type": "text/plain",
        },
        body: `Greetings from Azure Functions!\n\n===\n\n${body}`,
    }
}

const fn = new azure.appservice.HttpEventSubscription("fn", {
    resourceGroup,
    callback: handler,
})

// resource "azurerm_app_service_plan" "example" {
// name                = "example-appserviceplan"
// location            = var.resource_group
// resource_group_name = "${azurerm_resource_group.example.name}"

// sku {
//     tier = "Standard"
//     size = "F1"
// }
// }

// resource "azurerm_app_service" "example" {
// name                = "example-app-service"
// location            = "${azurerm_resource_group.example.location}"
// resource_group_name = "${azurerm_resource_group.example.name}"
// app_service_plan_id = "${azurerm_app_service_plan.example.id}"

// site_config {
//     dotnet_framework_version = "v4.0"
//     scm_type                 = "LocalGit"
// }

// app_settings = {
//     "SOME_KEY" = "some-value"
// }

// connection_string {
//     name  = "Database"
//     type  = "SQLServer"
//     value = "Server=some-server.mydomain.com;Integrated Security=SSPI"
// }
// }

export let endpoint = fn.url
export const connectionString = storageAccount.primaryConnectionString
