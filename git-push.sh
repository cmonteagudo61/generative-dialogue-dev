#!/bin/bash

# Git commit and push script for generative-dialogue-dev
echo "=== Git Commit and Push Script ==="
echo "Repository: https://github.com/cmonteagudo61/generative-dialogue-dev.git"
echo

# Check git status
echo "Current git status:"
git status --short

echo
echo "=== Staging changes ==="
# Add all changes
git add .

# Show what will be committed
echo "Files to be committed:"
git diff --cached --name-only

echo
echo "=== Creating commit ==="
# Create commit with descriptive message
COMMIT_MSG="UI Improvements: Enhanced bottom content area

- Increased font sizes throughout bottom content (18px-22px)
- Improved left text alignment with !important declarations
- Reduced left padding in tab content (20px → 8px desktop, 16px → 6px mobile)
- Enhanced readability and professional appearance
- Added scrolling functionality for longer content sections
- Responsive design improvements for mobile devices

Date: $(date '+%Y-%m-%d %H:%M:%S')"

git commit -m "$COMMIT_MSG"

echo
echo "=== Pushing to GitHub ==="
# Push to main branch
git push origin main

echo
echo "=== Push completed ==="
echo "Changes pushed to: https://github.com/cmonteagudo61/generative-dialogue-dev"
echo "View repository: https://github.com/cmonteagudo61/generative-dialogue-dev"

# Show final status
echo
echo "Final git status:"
git status --short 