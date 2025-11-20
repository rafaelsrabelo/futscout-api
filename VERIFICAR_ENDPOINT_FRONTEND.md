# 🔍 Verificação: Frontend está usando o endpoint correto?

## ❌ Problema Identificado

Pelos logs do frontend, vejo que:
- ✅ Upload para R2 foi concluído com sucesso
- ✅ URL pública obtida: `https://pub-0dfa82468e274a9cb1498740d1ce6c91.r2.dev/videos/1763670543408_RPReplay_Final1763513385.mp4`
- ❌ **NÃO há logs do backend sobre criação do play**

Isso significa que o frontend **NÃO está chamando** o endpoint `/plays/with-url` após o upload.

## ✅ O que o frontend DEVE fazer

### Após o upload para R2, o frontend DEVE chamar:

```typescript
// Após upload bem-sucedido para R2
const play = await futscoutApiClient.post('/plays/with-url', {
  play_type: 'GOAL', // ou outro tipo
  video_url: publicUrl, // URL do vídeo já no R2
  // thumbnail_url: NÃO enviar - backend gera automaticamente
  rating: 5, // opcional
  observations: '...', // opcional
  classifications: ['TECHNICAL'], // opcional
})
```

## 🔍 Como verificar no frontend

### 1. Verificar qual endpoint está sendo chamado

Procure no código do frontend por:
- `POST /plays` (endpoint antigo - multipart)
- `POST /plays/with-url` (endpoint correto - upload direto)

### 2. Logs que devem aparecer no backend

Se o frontend estiver chamando `/plays/with-url` corretamente, você verá no backend:

```
💾 Criando play com vídeo URL (upload direto): { play_type: 'GOAL', ... }
✅ Play criado com sucesso (upload direto): { id: '...', videoUrl: '...' }
🔄 Iniciando geração de thumbnail em background...
🚀 [THUMBNAIL] INICIANDO GERAÇÃO DE THUMBNAIL
```

### 3. Se não aparecer esses logs

O frontend está usando o endpoint errado ou não está chamando nenhum endpoint.

## 🛠️ Solução

### Opção A: Frontend está usando endpoint antigo (`/plays`)

Se o frontend está usando `POST /plays` (multipart), ele precisa mudar para `POST /plays/with-url`:

**Antes (errado):**
```typescript
const formData = new FormData()
formData.append('video', videoFile)
formData.append('playType', 'GOAL')
await futscoutApiClient.post('/plays', formData) // ❌ Endpoint antigo
```

**Depois (correto):**
```typescript
// 1. Upload direto para R2 (já está fazendo)
const { uploadUrl, publicUrl } = await getUploadUrl()
await uploadToR2(uploadUrl, videoFile)

// 2. Criar play com URL
await futscoutApiClient.post('/plays/with-url', { // ✅ Endpoint correto
  play_type: 'GOAL',
  video_url: publicUrl,
})
```

### Opção B: Frontend não está chamando nenhum endpoint

Se o frontend só faz upload mas não cria o play, adicione a chamada:

```typescript
// Após upload bem-sucedido
const publicUrl = 'https://pub-...r2.dev/videos/...'

// Criar play
const play = await futscoutApiClient.post('/plays/with-url', {
  play_type: 'GOAL',
  video_url: publicUrl,
})
```

## 📋 Checklist para o Frontend

- [ ] Upload direto para R2 ✅ (já está fazendo)
- [ ] Chamar `POST /plays/with-url` após upload ❌ (verificar se está fazendo)
- [ ] Enviar `video_url` (não `video` como arquivo)
- [ ] **NÃO** enviar `thumbnail_url` (backend gera)

## 🎯 Próximos Passos

1. **Verificar no código do frontend** qual endpoint está sendo chamado após o upload
2. **Se estiver usando `/plays` (multipart)**, mudar para `/plays/with-url`
3. **Se não estiver chamando nenhum**, adicionar a chamada para `/plays/with-url`
4. **Verificar logs do backend** para confirmar que está recebendo a requisição

## 📝 Exemplo Completo Correto

```typescript
async function uploadVideoAndCreatePlay() {
  // 1. Obter presigned URL
  const { uploadUrl, publicUrl } = await futscoutApiClient
    .get('/videos/upload-url', { params: { filename: 'video.mp4' } })
    .then(r => r.data)

  // 2. Upload direto para R2
  await FileSystem.uploadAsync(uploadUrl, videoFile.uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': 'video/mp4' },
  })

  // 3. ✅ CRIAR PLAY COM URL (isso está faltando!)
  const play = await futscoutApiClient.post('/plays/with-url', {
    play_type: 'GOAL',
    video_url: publicUrl, // URL do vídeo já no R2
    // thumbnail_url: NÃO enviar - backend gera
  })

  return play
}
```

---

**Resumo:** O frontend está fazendo upload para R2, mas provavelmente não está chamando `/plays/with-url` para criar o play. Verifique o código do frontend e adicione essa chamada se estiver faltando.

