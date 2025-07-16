#!/bin/bash

# Create timestamped backup of generative-dialogue-dev
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="generative-dialogue-backup-$TIMESTAMP"
BACKUP_DIR="../BACKUPS/$BACKUP_NAME"

echo "Creating backup: $BACKUP_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Copy essential project files (excluding node_modules, .git, build artifacts)
echo "Copying project files..."

# Copy client directory
rsync -av --exclude='node_modules' --exclude='build' --exclude='.DS_Store' client/ "$BACKUP_DIR/client/"

# Copy root files
cp *.md "$BACKUP_DIR/" 2>/dev/null || true
cp *.sh "$BACKUP_DIR/" 2>/dev/null || true
cp .gitignore "$BACKUP_DIR/" 2>/dev/null || true
cp package*.json "$BACKUP_DIR/" 2>/dev/null || true

# Create backup info file
cat > "$BACKUP_DIR/BACKUP_INFO.txt" << EOF
Backup Created: $(date)
Original Project: generative-dialogue-dev
Backup Contains:
- Client React application (src, public, package files)
- Project documentation (*.md files)
- Configuration files (.gitignore, scripts)
- Excludes: node_modules, build artifacts, .git directory

Recent Changes:
- Enhanced bottom content area with larger fonts (18px-22px)
- Improved left alignment and reduced left padding
- Fixed logo positioning and navigation layout
- Responsive design improvements

To Restore:
1. Copy contents to new directory
2. Run: cd client && npm install
3. Run: npm start

Last Working State: $(date)
EOF

echo "Backup created successfully at: $BACKUP_DIR"
echo "Backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"

# List backup contents
echo -e "\nBackup contents:"
find "$BACKUP_DIR" -type f | head -20
if [ $(find "$BACKUP_DIR" -type f | wc -l) -gt 20 ]; then
    echo "... and $(( $(find "$BACKUP_DIR" -type f | wc -l) - 20 )) more files"
fi 