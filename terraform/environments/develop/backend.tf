terraform {
  backend "s3" {
    bucket  = "REPLACE_WITH_TERRAFORM_STATE_BUCKET"
    key     = "dam-platform/develop/terraform.tfstate"
    region  = "REPLACE_WITH_AWS_REGION"
    encrypt = true
  }
}
