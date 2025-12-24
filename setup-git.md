# Git and GitHub Setup Guide

## Step 1: Install Git (if not already installed)

1. Download Git from: https://git-scm.com/download/win
2. Or use winget: `winget install --id Git.Git -e --source winget`
3. Restart VS Code after installation

## Step 2: Configure Git (first time only)

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Authenticate with GitHub

### Option A: GitHub CLI (Recommended)
1. Install GitHub CLI: `winget install --id GitHub.cli`
2. Authenticate: `gh auth login`
3. Follow the prompts to authenticate

### Option B: Personal Access Token
1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with `repo` scope
3. Use the token as your password when pushing

### Option C: SSH Keys
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your.email@example.com"`
2. Add to GitHub: Copy `~/.ssh/id_ed25519.pub` to GitHub → Settings → SSH and GPG keys

## Step 4: Initialize Repository and Push

Once Git is installed, run these commands:

```bash
# Initialize repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit"

# Create repository on GitHub (if using GitHub CLI)
gh repo create guidepost --public --source=. --remote=origin --push

# OR if repository already exists, add remote manually:
# git remote add origin https://github.com/YOUR_USERNAME/guidepost.git
# git branch -M main
# git push -u origin main
```

