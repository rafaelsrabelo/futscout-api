# 🎯 Passo a Passo: Obter Credenciais R2 S3-compatible

## ✅ O que você JÁ TEM:
- ✅ `CLOUDFLARE_R2_BUCKET` (footballscout-media)
- ✅ `CLOUDFLARE_ACCOUNT_ID` (2eb88d233bf729731fbcf58eb5e2...)
- ✅ `CLOUDFLARE_API_TOKEN` (token geral - não serve para S3)
- ✅ `CLOUDFLARE_R2_PUBLIC_URL`

## ❌ O que FALTA:
- ❌ `CLOUDFLARE_R2_ACCESS_KEY_ID` (32 caracteres)
- ❌ `CLOUDFLARE_R2_SECRET_ACCESS_KEY` (40+ caracteres)
- ❌ `CLOUDFLARE_R2_ENDPOINT` (opcional, mas recomendado)

---

## 📍 ONDE IR (Passo a Passo)

### 1. **No Dashboard do Cloudflare (onde você está agora)**

### 2. **Menu Lateral Esquerdo:**
   - Procure por **"Storage & databases"** (já está expandido na sua tela)
   - Clique em **"R2 object storage"** (não "Account API tokens")

### 3. **Na página do R2:**
   - Você verá seu bucket: `footballscout-media`
   - No **topo da página**, procure por um botão ou link:
     - **"Manage R2 API Tokens"** 
     - OU **"API Tokens"**
     - OU **"S3 API"**
     - OU um ícone de engrenagem/configurações

### 4. **Criar Token S3-compatible:**
   - Clique em **"Create API Token"** ou **"Create S3 Token"**
   - **Nome do token**: `futscout-r2-s3-upload` (ou qualquer nome)
   - **Permissions**: 
     - ✅ **Object Read & Write** (ou **Read & Write**)
     - ✅ Selecione o bucket: `footballscout-media`
   - **TTL**: Deixe padrão (sem expiração) ou configure
   - Clique em **"Create API Token"**

### 5. **Copiar Credenciais:**
   ⚠️ **IMPORTANTE**: Copie AGORA! O Secret Access Key não aparece novamente!

   Você verá:
   - **Access Key ID**: `abc123def456...` (32 caracteres)
   - **Secret Access Key**: `xyz789uvw012...` (40+ caracteres)

### 6. **Obter Endpoint (opcional):**
   - Na mesma página ou nas configurações do bucket
   - Procure por **"S3 API Endpoint"** ou **"S3-compatible API"**
   - Será algo como:
     ```
     https://2eb88d233bf729731fbcf58eb5e2.r2.cloudflarestorage.com
     ```
   - OU use o formato padrão:
     ```
     https://{ACCOUNT_ID}.r2.cloudflarestorage.com
     ```

---

## 🔧 Adicionar no Render

### No Render Dashboard:
1. Vá para seu serviço `futscout`
2. **Environment** → **Environment Variables** (ou **Secrets**)
3. Adicione:

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=abc123def456ghi789jkl012mno345pq
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xyz789uvw012rst345abc678def901ghi234jkl567
CLOUDFLARE_R2_ENDPOINT=https://2eb88d233bf729731fbcf58eb5e2.r2.cloudflarestorage.com
```

### 4. **Reiniciar Serviço:**
   - Após adicionar, faça **"Manual Deploy"** ou reinicie o serviço

---

## 🎯 Resumo do que fazer:

1. ✅ Menu lateral → **"R2 object storage"**
2. ✅ Na página do R2 → **"Manage R2 API Tokens"**
3. ✅ **"Create API Token"**
4. ✅ Permissions: **Object Read & Write**
5. ✅ Copiar **Access Key ID** (32 chars) e **Secret Access Key** (40+ chars)
6. ✅ Adicionar no Render como variáveis de ambiente
7. ✅ Reiniciar serviço

---

## ⚠️ Diferença Importante:

| Token | Tamanho | Onde usar |
|-------|---------|-----------|
| **CLOUDFLARE_API_TOKEN** (geral) | 40 chars | API do Cloudflare (não funciona com S3) |
| **CLOUDFLARE_R2_ACCESS_KEY_ID** (S3) | 32 chars | Upload direto S3-compatible ✅ |
| **CLOUDFLARE_R2_SECRET_ACCESS_KEY** (S3) | 40+ chars | Upload direto S3-compatible ✅ |

**Você precisa criar um NOVO token específico para R2 S3!**


