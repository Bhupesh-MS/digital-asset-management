#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-develop}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_DIR="${ROOT_DIR}/environments/${ENVIRONMENT}"

if [[ ! -d "${ENV_DIR}" ]]; then
  echo "Unknown Terraform environment: ${ENVIRONMENT}" >&2
  exit 1
fi

terraform -chdir="${ENV_DIR}" fmt -check -recursive
terraform -chdir="${ENV_DIR}" validate
