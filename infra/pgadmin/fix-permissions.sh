#!/bin/sh
# Fix permissions for pgAdmin data directory
# pgAdmin runs as UID 5050 inside the container
chown -R 5050:5050 /var/lib/pgadmin 2>/dev/null || true
# Execute the original entrypoint
exec /entrypoint.sh "$@"
