#!/bin/bash

echo "=== Git Repository Check ==="
echo ""

echo "1. Current directory:"
pwd
echo ""

echo "2. Is this a git repo?"
if [ -d .git ]; then
    echo "   YES - .git directory exists"
else
    echo "   NO - .git directory not found"
    exit 1
fi
echo ""

echo "3. Git status:"
git status
echo ""

echo "4. Files in conf/:"
ls -la conf/
echo ""

echo "5. Files in data/:"
ls -la data/
echo ""

echo "6. Checking if files are ignored:"
git check-ignore -v conf/config.json
git check-ignore -v data/providers.jsonl
echo ""

echo "7. Trying to add files explicitly:"
git add conf/config.json 2>&1
git add data/providers.jsonl 2>&1
echo ""

echo "8. Git status after add:"
git status

