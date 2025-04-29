#!/bin/bash

# This script creates a GitHub repository using the GitHub API

# Repository settings
REPO_NAME="kidmail-protector"
REPO_DESC="Email filtering and forwarding system that protects children from inappropriate content"

# Check for GitHub Personal Access Token
if [ -z "$GITHUB_TOKEN" ]; then
  echo "To use this script, you need to:"
  echo "1. Create a GitHub Personal Access Token at https://github.com/settings/tokens"
  echo "   - Select at least 'repo' and 'workflow' scopes"
  echo "2. Run the script with: GITHUB_TOKEN=your_token ./create-github-repo.sh"
  exit 1
fi

# Create GitHub repository
echo "Creating GitHub repository..."
RESPONSE=$(curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github+json" \
     -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false}" \
     https://api.github.com/user/repos)

# Extract the repo URL from the response
REPO_URL=$(echo "$RESPONSE" | grep -o '"html_url": "[^"]*' | head -1 | sed 's/"html_url": "//')

if [ -n "$REPO_URL" ]; then
  echo "Repository created successfully!"
  echo "Repository URL: $REPO_URL"
  echo ""
  echo "To push your code to GitHub:"
  echo "1. Download your Replit project as a ZIP file"
  echo "2. On your local machine:"
  echo "   git clone $REPO_URL"
  echo "   [unzip the downloaded file]"
  echo "   [copy files to the cloned repository]"
  echo "   git add ."
  echo "   git commit -m 'Initial commit'"
  echo "   git push origin main"
else
  echo "Failed to create repository. Response:"
  echo "$RESPONSE"
fi