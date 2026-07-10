# Cloud Run redirect service

Terraform for a Cloud Run service that 301-redirects **every** request to a
canonical host (default `https://metermanager.pvacd.com`), preserving path and
query string. Uses the prebuilt public image `schmunk42/nginx-redirect` — no
image to build or maintain.

This module creates the **service only**. It does not map a custom domain; point
DNS or a Cloud Run domain mapping at the emitted `service_url` yourself.

## Files

| File | Purpose |
|------|---------|
| `versions.tf` | Terraform + google provider constraints |
| `variables.tf` | Inputs (project, region, redirect target, scaling) |
| `main.tf` | `google_cloud_run_v2_service` + public invoker IAM |
| `outputs.tf` | Service name + `run.app` URL |
| `terraform.tfvars.example` | Copy to `terraform.tfvars` |

## Deploy

```sh
gcloud auth application-default login          # or set GOOGLE_APPLICATION_CREDENTIALS
gcloud services enable run.googleapis.com --project YOUR_PROJECT

cp terraform.tfvars.example terraform.tfvars   # edit project_id
terraform init
terraform apply
```

## Verify

```sh
URL=$(terraform output -raw service_url)
curl -sI "$URL/some/path?q=1"
# expect: HTTP/2 301
#         location: https://metermanager.pvacd.com/some/path?q=1
```

## Pointing the old domain at it

`terraform apply` gives a `*.run.app` URL. To send
`pvacd.newmexicowaterdata.org` through it, add a
[Cloud Run domain mapping](https://cloud.google.com/run/docs/mapping-custom-domains)
(needs the domain verified in the project) or front it with an external HTTPS
load balancer. Domain mapping was intentionally left out of this module — add it
here later if you want it managed in Terraform.

## Notes

- Public access: `allow_unauthenticated = true` grants `allUsers` the
  `roles/run.invoker` role so browsers can reach the redirect. An org policy
  (`iam.allowedPolicyMemberDomains`) may block `allUsers`; if apply fails on the
  IAM member, that policy is why.
- Swapping the image: set `image` and pass matching env var names via `env`.
- Pin the image: replace `:latest` in `variables.tf` with a specific tag or
  `@sha256:...` digest for reproducible deploys.
