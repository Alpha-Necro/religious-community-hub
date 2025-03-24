#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-"development"}
HELM_RELEASE="religious-community-hub"

# Rollback Helm release
helm rollback ${HELM_RELEASE} 1

# Rollback Kubernetes deployment
kubectl rollout undo deployment ${HELM_RELEASE}

# Rollback infrastructure
terraform destroy -var-file=env/${ENVIRONMENT}/terraform.tfvars -auto-approve
terraform apply -var-file=env/${ENVIRONMENT}/terraform.tfvars -auto-approve

# Verify rollback
kubectl get pods -l app=${HELM_RELEASE}
kubectl get services -l app=${HELM_RELEASE}
kubectl get deployments -l app=${HELM_RELEASE}
kubectl get statefulsets -l app=${HELM_RELEASE}
kubectl get configmaps -l app=${HELM_RELEASE}
kubectl get secrets -l app=${HELM_RELEASE}

# Print rollback status
echo "Rollback complete!"
echo "Environment: ${ENVIRONMENT}"
echo "Helm Release: ${HELM_RELEASE}"
