#!/bin/bash

# Script para marcar todas as migrações como aplicadas
# Execute no Render Shell

echo "🔄 Marcando todas as migrações como aplicadas..."

# Listar todas as migrações e marcar como aplicadas
for migration_dir in prisma/migrations/*/; do
  if [ -d "$migration_dir" ]; then
    migration_name=$(basename "$migration_dir")
    echo "📝 Marcando: $migration_name"
    npx prisma migrate resolve --applied "$migration_name"
  fi
done

echo ""
echo "✅ Todas as migrações foram marcadas como aplicadas!"
echo "🔍 Verificando status..."
npx prisma migrate status


