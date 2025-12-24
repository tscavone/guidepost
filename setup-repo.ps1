# Git Repository Setup Script
# Run this after installing Git

Write-Host "Setting up Git repository..." -ForegroundColor Green

# Check if Git is installed
try {
    $gitVersion = git --version
    Write-Host "Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Initialize repository if not already initialized
if (-not (Test-Path .git)) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Yellow
}

# Add all files
Write-Host "Adding files to staging..." -ForegroundColor Cyan
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Creating initial commit..." -ForegroundColor Cyan
    git commit -m "Initial commit"
} else {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

# Check for GitHub CLI
try {
    $ghVersion = gh --version 2>$null
    Write-Host "`nGitHub CLI found!" -ForegroundColor Green
    Write-Host "You can create a repository with: gh repo create guidepost --public --source=. --remote=origin --push" -ForegroundColor Cyan
} catch {
    Write-Host "`nGitHub CLI not found. You can:" -ForegroundColor Yellow
    Write-Host "1. Install it: winget install --id GitHub.cli" -ForegroundColor Cyan
    Write-Host "2. Or manually create a repo on GitHub.com and run:" -ForegroundColor Cyan
    Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/guidepost.git" -ForegroundColor White
    Write-Host "   git branch -M main" -ForegroundColor White
    Write-Host "   git push -u origin main" -ForegroundColor White
}

Write-Host "`nSetup complete!" -ForegroundColor Green

