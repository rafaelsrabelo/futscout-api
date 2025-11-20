# 🚀 Upload Direto para R2 - Guia de Implementação

## 📋 O que foi implementado

### 1. **Geração de Presigned URLs**
- Endpoint: `GET /api/videos/upload-url?filename=video.mp4&expiresIn=3600`
- Retorna URL assinada para upload direto do frontend para R2
- **Zero uso de memória no backend!**

### 2. **Fluxo Completo**

```
Frontend → GET /api/videos/upload-url → Recebe presigned URL
Frontend → PUT para R2 (direto) → Upload sem passar pelo backend
Frontend → POST /api/plays (com videoUrl) → Backend só salva URL
```

## 🔧 Configuração Necessária

### Variáveis de Ambiente

Adicione no `.env` e no Render:

```env
# R2 S3-compatible credentials (para presigned URLs)
CLOUDFLARE_R2_ACCESS_KEY_ID=seu_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=seu_secret_access_key
CLOUDFLARE_R2_ENDPOINT=https://2eb88d233bf729731fbcf58eb5e2.r2.cloudflarestorage.com
```

### Como obter as credenciais:

1. **Cloudflare Dashboard** → R2 → Manage R2 API Tokens
2. **Create API Token**
3. **Permissions**: Object Read & Write
4. **Copy**: Access Key ID e Secret Access Key
5. **Endpoint**: Use o S3 API endpoint do seu bucket

## 📦 Instalação de Dependências

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## 🎯 Como usar no Frontend

### 1. Obter URL de upload

```typescript
const response = await fetch(
  `${API_URL}/api/videos/upload-url?filename=${videoFile.name}&expiresIn=3600`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

const { uploadUrl, publicUrl, key } = await response.json();
```

### 2. Upload direto para R2

```typescript
const uploadResponse = await fetch(uploadUrl, {
  method: 'PUT',
  body: videoFile,
  headers: {
    'Content-Type': videoFile.type,
  },
});

if (uploadResponse.ok) {
  // Upload concluído! Agora salvar no backend
  console.log('Video uploaded to:', publicUrl);
}
```

### 3. Salvar no backend (apenas URL)

```typescript
const playResponse = await fetch(`${API_URL}/api/plays`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    play_type: 'GOAL',
    video_url: publicUrl, // URL já no R2
    // ... outros campos
  }),
});
```

## ✅ Benefícios

- ✅ **Zero uso de memória no backend**
- ✅ **Upload mais rápido** (direto para R2)
- ✅ **Sem risco de OOM Kill**
- ✅ **Sem compressão no servidor** (pode fazer depois com worker)
- ✅ **Escalável** (não depende do servidor)

## 🔄 Compressão Assíncrona (Opcional)

Se quiser comprimir depois:

1. **Cloudflare Worker** → Processa vídeo após upload
2. **Queue System** → Adiciona job de compressão
3. **Worker separado** → Faz compressão offline

## 📝 Notas

- Presigned URLs expiram em 1 hora (padrão)
- Frontend precisa fazer upload dentro do tempo de expiração
- Backend não recebe o arquivo, apenas a URL final
- Compatível com o sistema atual (multipart ainda funciona)


