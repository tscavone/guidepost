#!/bin/bash

# Git Repository Setup Script
# Run this after installing Git

echo "Setting up Git repository..."

# Check if Git is installed
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    echo "Git found: $GIT_VERSION"
else
    echo "ERROR: Git is not installed or not in PATH"
    echo "Please install Git from https://git-scm.com/download/win"
    exit 1
fi

# Initialize repository if not already initialized
if [ ! -d .git ]; then
    echo "Initializing Git repository..."
    git init
else
    echo "Git repository already initialized"
fi

# Add all files
echo "Adding files to staging..."
git add .

# Check if there are changes to commit
if [ -n "$(git status --porcelain)" ]; then
    echo "Creating initial commit..."
    git commit -m "Initial commit"
else
    echo "No changes to commit"
fi

# Check for GitHub CLI
if command -v gh &> /dev/null; then
    echo ""
    echo "GitHub CLI found!"
    echo "You can create a repository with: gh repo create guidepost --public --source=. --remote=origin --push"
else
    echo ""
    echo "GitHub CLI not found. You can:"
    echo "1. Install it: winget install --id GitHub.cli"
    echo "2. Or manually create a repo on GitHub.com and run:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/guidepost.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
fi

echo ""
echo "Setup complete!"

