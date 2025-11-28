# 🔧 Configurar Build Command no Render

## ❌ Problema Atual

O Render está usando `prisma migrate` que tenta aplicar todas as migrações, incluindo as que já foram executadas.

## ✅ Solução

Configure o Render para usar `prisma migrate deploy` que aplica apenas migrações novas.

### No Render Dashboard:

1. Vá em **Seu Serviço** → **Settings**
2. Em **Build Command**, use:

```bash
npm install && npm run build && npm run db:migrate:deploy
```

**Ou diretamente:**

```bash
npm install && npm run build && npx prisma migrate deploy
```

---

## 📋 O Que Cada Comando Faz

- `npm install` - Instala dependências
- `npm run build` - Compila TypeScript (se necessário)
- `npx prisma migrate deploy` - Aplica apenas migrações novas (não tenta recriar tabelas existentes)

---

## 🔍 Diferença

- `prisma migrate` - Tenta aplicar TODAS as migrações (causa erro se já existirem)
- `prisma migrate deploy` - Aplica apenas migrações NOVAS (seguro para produção)

---

## ⚠️ Se Ainda Der Erro

Execute no Render Shell ou localmente apontando para produção:

```bash
# Verificar estado
npx prisma migrate status

# Marcar migrações antigas como aplicadas
npx prisma migrate resolve --applied 20251023022959_create_users
# ... continue para todas as migrações que já foram aplicadas
```

Depois configure o Render para usar `migrate deploy`.

