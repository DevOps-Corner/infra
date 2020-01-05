import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure"
import * as random from "@pulumi/random"

const defaultTags = { pulumi: "true" }

const cdnResourceGroup = new azure.core.ResourceGroup("cdn-rg")

// const cdnProfile = new azure.cdn.Profile("cdn", {
//     resourceGroupName: cdnResourceGroup.name,
//     sku: "Standard_Microsoft",
// })

// const cdnEndpoint = new azure.cdn.Endpoint("cdn", {
//     origins: [{
//         hostName: "www.example.com",
//         name: "exampleCdnOrigin",
//     }],
//     profileName: cdnProfile.name,
//     resourceGroupName: cdnResourceGroup.name,
// });

//export const cdnHostname = cdnEndpoint.hostName

export class CDN extends pulumi.ComponentResource {
    readonly storageAccount: azure.storage.Account
    readonly container: azure.storage.Container

    constructor(name: string, opts?: pulumi.ComponentResourceOptions) {
        super("eknert:cdn:CDN", name, {}, opts)

        this.storageAccount = new azure.storage.Account(name + "sa", {
            resourceGroupName: cdnResourceGroup.name,
            accountReplicationType: "LRS",
            accountTier: "Standard",
            accountKind: "StorageV2",
            tags: defaultTags,
        })

        this.container = new azure.storage.Container(name + "-container", {
            containerAccessType: "private",
            storageAccountName: this.storageAccount.name,
        })
    }
}
