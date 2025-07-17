#!/bin/bash
echo "Checking for dependency conflicts..."

# Check all services for version mismatches
for service in services/*; do
  if [ -f "$service/package.json" ]; then
    echo "Checking $service..."
    cd "$service"
    npm ls --depth=0 | grep -E "UNMET|deduped|WARN"
    cd -
  fi
done
