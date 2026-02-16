#!/bin/bash

# GBNX Gold Trader Backend Deployment Script
# This script builds and deploys the backend Docker container

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="gbnx_gold_trader_backend"
IMAGE_NAME="gbnx-gold-trader-backend"
PORT=8081

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_message "$RED" "ERROR: .env file not found!"
        print_message "$YELLOW" "Please create a .env file in the backend directory with your configuration."
        exit 1
    fi
    print_message "$GREEN" "✓ .env file found"
}

# Function to stop and remove existing container
cleanup_existing() {
    print_message "$BLUE" "Checking for existing containers..."

    if docker ps -a | grep -q "$CONTAINER_NAME"; then
        print_message "$YELLOW" "Stopping existing container..."
        docker stop "$CONTAINER_NAME" || true

        print_message "$YELLOW" "Removing existing container..."
        docker rm "$CONTAINER_NAME" || true
    fi

    print_message "$GREEN" "✓ Cleanup completed"
}

# Function to build Docker image
build_image() {
    print_message "$BLUE" "Building Docker image..."

    local build_args=""
    if [ "$NO_CACHE" = "true" ]; then
        print_message "$YELLOW" "Building with --no-cache (fresh build)..."
        build_args="--no-cache"
    fi

    # Try to use BuildKit if available (faster builds with cache)
    if docker buildx version &> /dev/null; then
        print_message "$YELLOW" "Using BuildKit for optimized build..."
        DOCKER_BUILDKIT=1 docker build $build_args -t "$IMAGE_NAME:latest" .
    else
        print_message "$YELLOW" "BuildKit not available, using standard build..."
        docker build $build_args -t "$IMAGE_NAME:latest" .
    fi

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "✓ Docker image built successfully"
    else
        print_message "$RED" "ERROR: Failed to build Docker image"
        exit 1
    fi
}

# Function to run Docker container
run_container() {
    print_message "$BLUE" "Starting Docker container..."

    docker run -d \
        --name "$CONTAINER_NAME" \
        -p "$PORT:8081" \
        -v "$(pwd)/logs:/app/logs" \
        -v "$(pwd)/.env:/app/.env:ro" \
        --restart unless-stopped \
        "$IMAGE_NAME:latest"

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "✓ Container started successfully"
    else
        print_message "$RED" "ERROR: Failed to start container"
        exit 1
    fi
}

# Function to check container health
check_health() {
    print_message "$BLUE" "Checking container health..."
    sleep 5

    for i in {1..10}; do
        if curl -f http://localhost:$PORT/ > /dev/null 2>&1; then
            print_message "$GREEN" "✓ Backend is healthy and responding!"
            print_message "$GREEN" "Backend is running at: http://localhost:$PORT"
            return 0
        fi
        print_message "$YELLOW" "Waiting for backend to be ready... ($i/10)"
        sleep 3
    done

    print_message "$RED" "WARNING: Backend might not be ready yet. Check logs with: docker logs $CONTAINER_NAME"
}

# Function to use docker compose instead
deploy_with_compose() {
    print_message "$BLUE" "Deploying with docker compose..."

    # Stop existing services
    docker compose down || true

    local build_args=""
    if [ "$NO_CACHE" = "true" ]; then
        print_message "$YELLOW" "Building with --no-cache (fresh build)..."
        build_args="--no-cache"
    fi

    # Build and start services (BuildKit will be used if DOCKER_BUILDKIT env is set)
    # Set TMPDIR to use large /data volume for build process
    if docker buildx version &> /dev/null; then
        print_message "$YELLOW" "Using BuildKit for optimized build..."
        TMPDIR=/data/tmp DOCKER_BUILDKIT=1 docker compose build $build_args && docker compose up -d
    else
        print_message "$YELLOW" "BuildKit not available, using standard build..."
        TMPDIR=/data/tmp docker compose build $build_args && docker compose up -d
    fi

    if [ $? -eq 0 ]; then
        print_message "$GREEN" "✓ Services started with docker compose"
        check_health
    else
        print_message "$RED" "ERROR: Failed to deploy with docker compose"
        exit 1
    fi
}

# Main deployment flow
main() {
    print_message "$BLUE" "========================================="
    print_message "$BLUE" "GBNX Gold Trader Backend Deployment"
    print_message "$BLUE" "========================================="
    echo ""

    # Check prerequisites
    check_env_file

    # Ask user for deployment method
    echo ""
    print_message "$YELLOW" "Choose deployment method:"
    echo "1) Docker (manual)"
    echo "2) Docker Compose (recommended)"
    read -p "Enter choice [1-2]: " choice

    # Ask if user wants to clear cache
    echo ""
    read -p "Clear Docker cache and rebuild from scratch? (y/n): " clear_cache
    if [[ "$clear_cache" =~ ^[Yy]$ ]]; then
        export NO_CACHE="true"
        print_message "$YELLOW" "Will build with --no-cache"
    fi

    case $choice in
        1)
            cleanup_existing
            build_image
            run_container
            check_health
            ;;
        2)
            deploy_with_compose
            ;;
        *)
            print_message "$RED" "Invalid choice. Exiting."
            exit 1
            ;;
    esac

    echo ""
    print_message "$GREEN" "========================================="
    print_message "$GREEN" "Deployment completed successfully!"
    print_message "$GREEN" "========================================="
    echo ""
    print_message "$BLUE" "Useful commands:"
    echo "  View logs:        docker logs -f $CONTAINER_NAME"
    echo "  Stop container:   docker stop $CONTAINER_NAME"
    echo "  Restart:          docker restart $CONTAINER_NAME"
    echo "  Remove:           docker rm -f $CONTAINER_NAME"
    echo "  With compose:     docker compose logs -f"
    echo "  Stop compose:     docker compose down"
    echo ""
}

# Run main function
main
