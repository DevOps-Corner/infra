import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure"

export const allowSsh = {
    name: "SSH",
    priority: 1001,
    direction: "Inbound",
    access: "Allow",
    protocol: "Tcp",
    sourcePortRange: "*",
    destinationPortRange: "22",
    sourceAddressPrefix: "*",
    destinationAddressPrefix: "*",
}
