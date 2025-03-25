#!/bin/bash

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m

# Check if required variables are set
check_env_vars() {
    local required_vars=(
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_REGION"
        "AWS_ECS_CLUSTER"
        "AWS_ECS_SERVICE"
        "DB_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "SESSION_SECRET"
    )

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo -e "${RED}Error: $var is not set${NC}"
            exit 1
        fi
    done
}

# Build and push Docker images
build_and_push() {
    echo -e "${YELLOW}Building Docker images...${NC}"
    
    # Build server image
    docker build -t religious-community-hub:latest -f Dockerfile.prod .
    
    # Push to ECR
    echo -e "${YELLOW}Pushing images to ECR...${NC}"
    $(aws ecr get-login --no-include-email --region $AWS_REGION)
    docker tag religious-community-hub:latest $AWS_ECR_REPOSITORY
    docker push $AWS_ECR_REPOSITORY
}

# Deploy to ECS
deploy_to_ecs() {
    echo -e "${YELLOW}Deploying to ECS...${NC}"
    
    # Update ECS service
    aws ecs update-service --cluster $AWS_ECS_CLUSTER --service $AWS_ECS_SERVICE --force-new-deployment
    
    # Wait for deployment to complete
    echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
    aws ecs wait services-stable --cluster $AWS_ECS_CLUSTER --services $AWS_ECS_SERVICE
}

# Main deployment function
main() {
    echo -e "${GREEN}Starting deployment...${NC}"
    
    # Check environment variables
    check_env_vars
    
    # Build and push images
    build_and_push
    
    # Deploy to ECS
    deploy_to_ecs
    
    echo -e "${GREEN}Deployment completed successfully!${NC}"
}

# Run main function
main
