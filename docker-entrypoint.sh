#!/bin/sh
set -e

echo "Migrations present in this image:"
ls -1 prisma/migrations | grep -v migration_lock || echo "(none found!)"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec node server.js
