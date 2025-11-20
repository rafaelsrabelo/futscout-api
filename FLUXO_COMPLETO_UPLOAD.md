# 🎬 Fluxo Completo: Upload de Vídeo + Geração de Thumbnail

## 📱 O QUE O FRONTEND FAZ

### Passo 1: Obter URL de Upload (Presigned URL)

```typescript
// Frontend solicita URL assinada
const response = await futscoutApiClient.get('/videos/upload-url', {
  params: {
    filename: videoFile.name, // Ex: "video.mp4"
    expiresIn: 3600, // 1 hora (opcional)
  },
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})

const { uploadUrl, publicUrl } = response.data
// uploadUrl: URL para fazer PUT do vídeo
// publicUrl: URL pública final do vídeo no R2
```

### Passo 2: Upload Direto para R2 (SEM passar pelo backend)

```typescript
// Frontend faz upload DIRETO para R2 usando expo-file-system
import * as FileSystem from 'expo-file-system'

const uploadResult = await FileSystem.uploadAsync(uploadUrl, videoFile.uri, {
  httpMethod: 'PUT',
  headers: {
    'Content-Type': videoFile.type || 'video/mp4',
  },
  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
})

// Upload concluído! Vídeo está no R2
```

### Passo 3: Criar Play com URL (Backend só salva a URL)

```typescript
// Frontend cria play enviando APENAS a URL do vídeo
const play = await futscoutApiClient.post('/plays/with-url', {
  play_type: 'GOAL',
  video_url: publicUrl, // URL do vídeo já no R2
  // thumbnail_url: NÃO precisa enviar - backend gera automaticamente!
  rating: 5,
  observations: 'Gol de falta',
  classifications: ['TECHNICAL', 'MENTAL'],
}, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
})

// Play criado! Mas thumbnailUrl pode vir como null inicialmente
console.log(play.thumbnailUrl) // null (ainda não foi gerado)
```

---

## 🔄 O QUE O BACKEND FAZ AUTOMATICAMENTE

### Quando o play é criado:

1. **Backend recebe a requisição:**
   ```
   POST /api/plays/with-url
   {
     play_type: "GOAL",
     video_url: "https://pub-...r2.dev/videos/...",
     // thumbnail_url: não enviado
   }
   ```

2. **Backend cria o play imediatamente:**
   - Salva no banco com `thumbnailUrl: null`
   - Responde ao frontend imediatamente (resposta rápida)

3. **Backend inicia geração de thumbnail em background:**
   ```
   🔄 Iniciando geração de thumbnail em background...
   🚀 [THUMBNAIL] INICIANDO GERAÇÃO DE THUMBNAIL
   ```

4. **Backend baixa o vídeo do R2:**
   ```
   📥 Baixando vídeo para gerar thumbnail: https://...
   ✅ Vídeo baixado com sucesso
   ```

5. **Backend gera thumbnail com FFmpeg:**
   ```
   🖼️ Gerando thumbnail do vídeo...
   ✅ Thumbnail gerado com sucesso
   ```

6. **Backend faz upload do thumbnail para R2:**
   ```
   🖼️ [THUMBNAIL] Fazendo upload do thumbnail para R2...
   🖼️ [THUMBNAIL] Thumbnail enviado para R2: https://...thumbnails/...
   ```

7. **Backend atualiza o play no banco:**
   ```
   ✅ [THUMBNAIL] THUMBNAIL GERADO E SALVO COM SUCESSO!
   Play atualizado: thumbnailUrl = "https://...thumbnails/..."
   ```

---

## ⏱️ TIMING DO THUMBNAIL

### Resposta Imediata (0-1 segundo)
```json
{
  "play": {
    "id": "b18c143f-9b9e-4dcb-8f43-1dd47b19b2c5",
    "videoUrl": "https://pub-...r2.dev/videos/...",
    "thumbnailUrl": null,  // ⚠️ Ainda não foi gerado
    ...
  }
}
```

### Após 10-30 segundos (thumbnail pronto)
```json
{
  "play": {
    "id": "b18c143f-9b9e-4dcb-8f43-1dd47b19b2c5",
    "videoUrl": "https://pub-...r2.dev/videos/...",
    "thumbnailUrl": "https://pub-...r2.dev/thumbnails/...",  // ✅ Gerado!
    ...
  }
}
```

---

## 🎯 O QUE O FRONTEND PRECISA FAZER

### ✅ OBRIGATÓRIO

1. **Fazer upload direto para R2** (usando presigned URL)
2. **Criar play com `video_url`** (sem `thumbnail_url`)
3. **Aguardar resposta do backend** (play criado)

### ⚠️ OPCIONAL (mas recomendado)

#### Opção A: Aguardar thumbnail aparecer (Polling)

```typescript
async function createPlayAndWaitForThumbnail(videoUrl: string) {
  // 1. Criar play
  const play = await futscoutApiClient.post('/plays/with-url', {
    play_type: 'GOAL',
    video_url: videoUrl,
  })

  // 2. Se thumbnail já veio, retornar
  if (play.thumbnailUrl) {
    return play
  }

  // 3. Aguardar thumbnail aparecer (polling)
  let attempts = 0
  const maxAttempts = 10 // 10 tentativas = ~30 segundos

  while (attempts < maxAttempts && !play.thumbnailUrl) {
    await new Promise(resolve => setTimeout(resolve, 3000)) // 3 segundos

    // Buscar play atualizado
    const updatedPlay = await futscoutApiClient.get(`/plays/${play.id}`)
    
    if (updatedPlay.thumbnailUrl) {
      return updatedPlay
    }

    attempts++
  }

  // Thumbnail não apareceu (pode ter falhado)
  return play
}
```

#### Opção B: Mostrar placeholder enquanto gera

```typescript
// Criar play
const play = await futscoutApiClient.post('/plays/with-url', {
  play_type: 'GOAL',
  video_url: videoUrl,
})

// Mostrar placeholder se thumbnail não veio
const thumbnailUrl = play.thumbnailUrl || 'placeholder-image.jpg'

// Exibir no feed com placeholder
<Image source={{ uri: thumbnailUrl }} />
```

#### Opção C: Regenerar thumbnail manualmente (se necessário)

```typescript
// Se o thumbnail não aparecer após alguns segundos
// Pode forçar regeneração:
await futscoutApiClient.post(`/plays/${play.id}/regenerate-thumbnail`)

// Depois buscar play atualizado
const updatedPlay = await futscoutApiClient.get(`/plays/${play.id}`)
```

---

## 📋 RESUMO DO FLUXO COMPLETO

```
┌─────────────┐
│   FRONTEND  │
└──────┬──────┘
       │
       │ 1. GET /videos/upload-url
       ├─────────────────────────────┐
       │                             │
       │ 2. PUT uploadUrl (R2)       │
       ├─────────────────────────────┐
       │                             │
       │ 3. POST /plays/with-url     │
       │    { video_url: "..." }     │
       ├─────────────────────────────┐
       │                             │
       │ 4. Recebe play (thumbnailUrl: null)
       │                             │
       │ 5. (Opcional) Polling ou placeholder
       │                             │
┌──────┴──────┐                      │
│   BACKEND   │                      │
└──────┬──────┘                      │
       │                             │
       │ 6. Cria play no banco       │
       │    (thumbnailUrl: null)     │
       │                             │
       │ 7. Inicia geração em background
       │                             │
       │ 8. Baixa vídeo do R2       │
       │                             │
       │ 9. Gera thumbnail (FFmpeg) │
       │                             │
       │ 10. Upload thumbnail para R2
       │                             │
       │ 11. Atualiza play no banco  │
       │     (thumbnailUrl: "https://...")
       │                             │
       └─────────────────────────────┘
```

---

## ✅ CHECKLIST PARA O FRONTEND

- [ ] Obter presigned URL (`GET /videos/upload-url`)
- [ ] Fazer upload direto para R2 (`PUT uploadUrl`)
- [ ] Criar play com `video_url` (`POST /plays/with-url`)
- [ ] **NÃO enviar `thumbnail_url`** (backend gera automaticamente)
- [ ] Tratar `thumbnailUrl: null` inicialmente
- [ ] (Opcional) Fazer polling para ver thumbnail quando pronto
- [ ] (Opcional) Mostrar placeholder enquanto gera

---

## 🚨 IMPORTANTE

### ❌ NÃO FAZER:
- ❌ Enviar `thumbnail_url` se não tiver (deixe o backend gerar)
- ❌ Aguardar thumbnail na resposta inicial (vem como `null`)
- ❌ Fazer upload do vídeo pelo backend (use upload direto)

### ✅ FAZER:
- ✅ Upload direto para R2 (mais rápido)
- ✅ Criar play sem `thumbnail_url` (backend gera)
- ✅ Tratar `thumbnailUrl: null` inicialmente
- ✅ (Opcional) Fazer polling ou mostrar placeholder

---

## 💡 EXEMPLO COMPLETO (React Native/Expo)

```typescript
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { futscoutApiClient } from './api/futscout'

async function createPlayWithVideo() {
  try {
    // 1. Selecionar vídeo
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    })
    
    if (result.canceled) return

    const videoFile = {
      uri: result.assets[0].uri,
      name: result.assets[0].fileName || `video_${Date.now()}.mp4`,
      type: result.assets[0].mimeType || 'video/mp4',
    }

    // 2. Obter presigned URL
    const { uploadUrl, publicUrl } = await futscoutApiClient
      .get('/videos/upload-url', {
        params: { filename: videoFile.name },
      })
      .then(r => r.data)

    // 3. Upload direto para R2
    await FileSystem.uploadAsync(uploadUrl, videoFile.uri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': videoFile.type },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    })

    // 4. Criar play (SEM thumbnail_url - backend gera)
    const play = await futscoutApiClient.post('/plays/with-url', {
      play_type: 'GOAL',
      video_url: publicUrl,
      // thumbnail_url: NÃO enviar!
      rating: 5,
    })

    // 5. Play criado! thumbnailUrl pode ser null inicialmente
    console.log('Play criado:', play.id)
    console.log('Thumbnail:', play.thumbnailUrl) // null ou URL

    // 6. (Opcional) Aguardar thumbnail aparecer
    if (!play.thumbnailUrl) {
      // Fazer polling ou mostrar placeholder
      // O backend vai gerar em background e atualizar
    }

    return play
  } catch (error) {
    console.error('Erro:', error)
    throw error
  }
}
```

---

**Resumo:** Frontend faz upload direto e cria play. Backend gera thumbnail automaticamente em background. Thumbnail pode demorar 10-30 segundos para aparecer.

