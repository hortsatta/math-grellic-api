#!/bin/bash

# Navigate to the project directory
cd ~/master/repo/math-grellic/math-grellic-api || exit

# Pull the latest changes from GitHub
git pull origin master

# Stop and remove old containers
docker compose -f scripts/docker-compose.yml down

# Pull latest images if needed
docker compose -f scripts/docker-compose.yml pull

# Rebuild and start the updated containers
docker compose -f scripts/docker-compose.yml up -d

# Remove old images
docker image prune -af

# Log deployment time
echo "deployed at $(date)" >> /var/log/deploy.log