#!/bin/bash

# This script helps set up GitHub repository connection

# Repository settings
REPO_NAME="kidmail-protector"
REPO_DESC="Email filtering and forwarding system that protects children from inappropriate content"

# Check for GitHub Personal Access Token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "To use this script, you need to:"
  echo "1. Create a GitHub Personal Access Token at https://github.com/settings/tokens"
  echo "   - Select at least 'repo' and 'workflow' scopes"
  echo "2. Run the script with: GITHUB_TOKEN=your_token ./setup-github.sh"
  exit 1
fi

# Configure git
git config --global user.name "Replit User"
git config --global user.email "user@example.com"

# Initialize repository if needed
if [ ! -d .git ]; then
  git init
  echo "Git repository initialized"
fi

# Stage all files
git add .

# Commit changes if there are any
git commit -m "Initial commit of KidMail Protector"

# Create GitHub repository
echo "Creating GitHub repository..."
curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
     -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false}" \
     https://api.github.com/user/repos

# Add GitHub as remote
git remote add origin https://github.com/${GITHUB_USERNAME:-$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep login | sed 's/.*: "\(.*\)",/\1/')}/$REPO_NAME.git

# Push to GitHub
git push -u origin main || git push -u origin master

echo "Repository setup complete! Check your GitHub account for the new repository."