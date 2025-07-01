#!/bin/bash

echo "Building for Cloudflare Workers with hardcoded API keys..."

# Build worker bundle only (no env vars needed)
echo "Building worker..."
npx esbuild workers/worker.ts \
  --platform=browser \
  --target=es2022 \
  --bundle \
  --format=esm \
  --outfile=dist/worker.js

echo "Worker build complete!"
echo "Make sure to edit workers/worker.ts with your actual API keys before deploying"
echo "Deploy with: npx wrangler deploy"