#!/bin/bash
# Script to properly link local packages before build

echo "Linking local packages..."
cd /app/packages
npm install --legacy-peer-deps
npm run build

cd /app
npm link ./packages

echo "Local packages linked successfully"
