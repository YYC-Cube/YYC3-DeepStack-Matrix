const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = ['file', 'description', 'author', 'version', 'created', 'updated', 'status', 'tags'];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  if (!lines[0].includes('/**') && !lines[0].includes('---')) {
    return { valid: false, error: 'Missing header' };
  }

  const missingFields = REQUIRED_FIELDS.filter(field => !content.includes(field));
  if (missingFields.length > 0) {
    return { valid: false, error: `Missing fields: ${missingFields.join(', ')}` };
  }

  return { valid: true };
}

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let validCount = 0;
  let invalidCount = 0;
  const invalidFiles = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      return checkDirectory(filePath);
    }

    if (!file.match(/\.(ts|tsx|js|jsx|css|scss|md)$/)) {
      return;
    }

    const result = checkFile(filePath);
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      invalidFiles.push({ file, error: result.error });
    }
  });

  console.log(`Valid: ${validCount}, Invalid: ${invalidCount}`);
  if (invalidFiles.length > 0) {
    console.log('Invalid files:');
    invalidFiles.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
}

checkDirectory('./src');
