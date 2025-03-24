#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-"development"}
HELM_RELEASE="religious-community-hub"

# Update Helm chart
helm upgrade ${HELM_RELEASE} charts/${HELM_RELEASE} \
  -f values/${ENVIRONMENT}/values.yaml

# Update Kubernetes resources
kubectl apply -f k8s/${ENVIRONMENT}/

# Update infrastructure
terraform plan -var-file=env/${ENVIRONMENT}/terraform.tfvars
terraform apply -var-file=env/${ENVIRONMENT}/terraform.tfvars -auto-approve

# Verify update
kubectl get pods -l app=${HELM_RELEASE}
kubectl get services -l app=${HELM_RELEASE}
kubectl get deployments -l app=${HELM_RELEASE}
kubectl get statefulsets -l app=${HELM_RELEASE}
kubectl get configmaps -l app=${HELM_RELEASE}
kubectl get secrets -l app=${HELM_RELEASE}

# Print update status
echo "Update complete!"
echo "Environment: ${ENVIRONMENT}"
echo "Helm Release: ${HELM_RELEASE}"
