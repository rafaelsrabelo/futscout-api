#!/bin/bash

echo "🚀 Iniciando setup do banco de dados..."

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

echo "📦 Iniciando o banco PostgreSQL..."
docker-compose up -d

echo "⏳ Aguardando o banco inicializar..."
sleep 15

# Verificar se o banco está realmente rodando
echo "🔍 Verificando conexão com o banco..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if docker exec futscout-api-pg pg_isready -U docker > /dev/null 2>&1; then
        echo "✅ Banco conectado com sucesso!"
        break
    fi
    echo "⏳ Tentativa $attempt/$max_attempts - Aguardando banco..."
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Erro: Não foi possível conectar ao banco"
    exit 1
fi

echo "🔄 Aplicando migrações..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrações aplicadas com sucesso!"
else
    echo "❌ Erro ao aplicar migrações"
    exit 1
fi

echo "🌱 Executando seed (se existir)..."
npx prisma db seed 2>/dev/null || echo "ℹ️  Nenhum seed configurado"

echo ""
echo "🎉 Setup concluído! O banco está pronto para uso."
echo "🔗 Para visualizar os dados: npm run studio"
echo "🚀 Para iniciar o servidor: npm run start:dev"