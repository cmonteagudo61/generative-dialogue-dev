# Backup and Version Control Instructions

## Current Project Status
- **Project**: Generative Dialogue Dev
- **Repository**: https://github.com/cmonteagudo61/generative-dialogue-dev.git
- **Last Updated**: UI improvements with enhanced bottom content area

## Quick Commands

### Create Backup
```bash
chmod +x create-backup.sh
./create-backup.sh
```

### Push to GitHub
```bash
chmod +x git-push.sh
./git-push.sh
```

## Backup System

### What Gets Backed Up
- ✅ Client React application (`/client` folder)
- ✅ All documentation files (`*.md`)
- ✅ Configuration files (`.gitignore`, scripts)
- ✅ Package files (`package.json`, etc.)
- ❌ `node_modules` (excluded - will be reinstalled)
- ❌ Build artifacts (excluded)
- ❌ `.git` directory (excluded)

### Backup Location
Backups are created in: `../BACKUPS/generative-dialogue-backup-YYYYMMDD_HHMMSS/`

### Restore from Backup
1. Navigate to backup directory
2. Copy contents to new project directory
3. Install dependencies:
   ```bash
   cd client
   npm install
   ```
4. Start development server:
   ```bash
   npm start
   ```

## Git Workflow

### Current Repository
- **Origin**: https://github.com/cmonteagudo61/generative-dialogue-dev.git
- **Branch**: main
- **Status**: Active repository with remote tracking

### Manual Git Commands
```bash
# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Pull latest changes
git pull origin main
```

## Recent Changes (Last Backup)
- Enhanced bottom content area fonts (18px-22px)
- Improved left text alignment
- Reduced left padding for better text positioning
- Added scrolling functionality for long content
- Responsive design improvements
- Fixed logo positioning and navigation layout

## Emergency Recovery
If something breaks during development:
1. Run `./create-backup.sh` first (if possible)
2. Find latest backup in `../BACKUPS/`
3. Copy backup to new directory
4. Run `npm install` in client folder
5. Test with `npm start`

## Files Modified in Last Session
- `/client/src/components/BottomContentArea.css`
- `/client/src/components/BottomContentArea.js`
- Various navigation and layout components

---
**Generated**: $(date)
**Working State**: ✅ Confirmed working on localhost:3000 