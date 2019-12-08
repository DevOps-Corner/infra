import * as pulumi from "@pulumi/pulumi"
import * as azure from "@pulumi/azure"

const textPlainResponse = function(body: string) {
    return {
        status: 200,
        headers: {
            "content-type": "text/plain",
        },
        body: body,
    }
}

const printHeaders = async function(
    context: azure.appservice.Context<azure.appservice.HttpResponse>,
    request: azure.appservice.HttpRequest
) {
    let body = ""
    const headers = request.headers
    for (const h of Object.keys(request.headers)) {
        body = body + `${h} = ${headers[h]}\n`
    }

    return textPlainResponse(
        `Greetings from Azure Functions!\n\n===\n\n${body}`
    )
}

export interface PrintHeadersFunctionArgs {
    readonly resourceGroup: azure.core.ResourceGroup
}

export class PrintHeadersFunction extends pulumi.ComponentResource {
    fn: azure.appservice.HttpEventSubscription

    constructor(
        name: string,
        args: PrintHeadersFunctionArgs,
        opts?: pulumi.ComponentResourceOptions
    ) {
        super("eknert:function:PrintHeadersFunction", name, {}, opts)

        this.fn = new azure.appservice.HttpEventSubscription("printHeaders", {
            resourceGroup: args.resourceGroup,
            callback: printHeaders,
        })

        this.registerOutputs({
            endpoint: this.fn.url,
        })
    }
}
