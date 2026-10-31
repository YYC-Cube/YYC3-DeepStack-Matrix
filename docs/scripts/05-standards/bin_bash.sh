#!/bin/bash
# .git/hooks/pre-commit

FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|css|scss|md)$')

if [ -z "$FILES" ]; then
  exit 0
fi

node scripts/check-headers.js

if [ $? -ne 0 ]; then
  echo "❌ Header check failed. Please add proper headers to your files."
  exit 1
fi

echo "✅ Header check passed."
exit 0
