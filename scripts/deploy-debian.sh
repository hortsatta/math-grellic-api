#!/bin/bash

# Navigate to the project directory
cd ~/master/repo/math-grellic/math-grellic-api || exit

# Reset any local changes and discard untracked files
# Resets tracked files to match remote
git reset --hard origin/master 
# Removes untracked files and directories
git clean -fd

# Pull the latest changes from GitHub
git pull origin master --rebase

# Stop and remove old containers
docker compose down

# Pull latest images if needed
docker compose pull

# Rebuild and start the updated containers
docker compose -f scripts/docker-compose.yml up -d

# Remove old images
docker image prune -af

# Log deployment time
echo "deployed at $(date)" >> /var/log/deploy.log