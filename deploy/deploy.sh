#!/bin/bash

set -e

# Configuration
ENVIRONMENT=${1:-"development"}
DOCKER_IMAGE="religious-community-hub"
DOCKER_TAG="latest"
KUBE_CONTEXT="production"
HELM_RELEASE="religious-community-hub"

# Build and push Docker image
docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} .
docker push ${DOCKER_IMAGE}:${DOCKER_TAG}

# Deploy infrastructure
terraform init
terraform plan -var-file=env/${ENVIRONMENT}/terraform.tfvars
terraform apply -var-file=env/${ENVIRONMENT}/terraform.tfvars -auto-approve

# Deploy Kubernetes resources
kubectl apply -f k8s/${ENVIRONMENT}/

# Deploy Helm chart
helm upgrade ${HELM_RELEASE} charts/${HELM_RELEASE} \
  -f values/${ENVIRONMENT}/values.yaml \
  --set image.tag=${DOCKER_TAG}

# Verify deployment
kubectl get pods -l app=${HELM_RELEASE}
kubectl get services -l app=${HELM_RELEASE}
kubectl get deployments -l app=${HELM_RELEASE}
kubectl get statefulsets -l app=${HELM_RELEASE}
kubectl get configmaps -l app=${HELM_RELEASE}
kubectl get secrets -l app=${HELM_RELEASE}

# Print deployment status
echo "Deployment complete!"
echo "Environment: ${ENVIRONMENT}"
echo "Docker Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
echo "Kubernetes Context: ${KUBE_CONTEXT}"
echo "Helm Release: ${HELM_RELEASE}"
