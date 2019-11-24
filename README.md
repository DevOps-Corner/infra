# infra

My infrastructure for side projects and such. Built on Azure using Terraform, Packer and Ansible.


# Build and deployment steps

1. Image is built: `packer build ubuntu.json` and use `-force` to overwrite previous.
2. Terraform will use the image when setting up the Matomo machine.
