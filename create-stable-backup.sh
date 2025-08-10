#!/bin/bash
#
# Creates a timestamped backup of the entire generative-dialogue-dev project.
# The backup will be a compressed tar.gz file.
#

# Get the current date and time
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Define the backup filename
BACKUP_FILENAME="generative-dialogue-dev-backup-${TIMESTAMP}.tar.gz"

# Define the directory to be backed up
SOURCE_DIR="."

# Define the files/directories to exclude
EXCLUDE_PATTERNS=(
  "--exclude='*.log'"
  "--exclude='*.out'"
  "--exclude='node_modules'"
  "--exclude='*.DS_Store'"
  "--exclude='client/build'"
  "--exclude='*.tar.gz'"
)

# Create the compressed backup
echo "Creating backup: ${BACKUP_FILENAME}..."
tar "${EXCLUDE_PATTERNS[@]}" -czvf "${BACKUP_FILENAME}" "${SOURCE_DIR}"

echo "Backup complete!"
echo "File created at: $(pwd)/${BACKUP_FILENAME}" 