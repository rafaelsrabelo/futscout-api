# 📹 Como Funciona a Contagem de Vídeos

## ❓ Pergunta

**"Se o atleta enviar um vídeo e apagar depois, vai ser contado que o vídeo foi adicionado? Se apagar continua o upload feito, entende? Ele conta como vídeo gasto para esgotar o plano, onde valido isso? No R2?"**

## ✅ Resposta

### Onde a validação acontece?

**A validação acontece no BANCO DE DADOS, não no R2.**

- **R2 (Cloudflare)**: Apenas armazena o arquivo de vídeo
- **Banco de Dados**: Contém os contadores de uso (`Usage` table)
- **Middleware**: Verifica os contadores ANTES de permitir criar novo conteúdo

### Como funciona atualmente (APÓS a correção):

#### 1. **Criar Vídeo → Incrementa Contador**

```typescript
// Quando cria play com vídeo
POST /api/plays/with-url
→ Cria play no banco
→ Incrementa standaloneVideosUsed +1 ✅
```

#### 2. **Deletar Vídeo → Decrementa Contador**

```typescript
// Quando deleta play com vídeo
DELETE /api/plays/:id
→ Verifica se tem videoUrl
→ Se tem matchId → Decrementa videosUsed -1 ✅
→ Se não tem matchId → Decrementa standaloneVideosUsed -1 ✅
→ Deleta play do banco
```

#### 3. **Deletar Jogo → Decrementa Contadores**

```typescript
// Quando deleta match
DELETE /api/matches/:id
→ Conta quantos vídeos tinha nos plays da partida
→ Decrementa videosUsed (um por vídeo) ✅
→ Decrementa matchesUsed -1 ✅
→ Deleta match (plays são deletados em cascade)
```

---

## 🔄 Fluxo Completo

### Cenário: Usuário cria e depois deleta vídeo

```
1. Usuário cria vídeo standalone
   → POST /api/plays/with-url
   → Play criado com videoUrl
   → standaloneVideosUsed: 0 → 1 ✅

2. Vídeo é enviado para R2
   → Arquivo fica armazenado no R2
   → URL salva no banco (play.videoUrl)

3. Usuário deleta o vídeo
   → DELETE /api/plays/:id
   → Sistema verifica: tem videoUrl? SIM
   → Sistema verifica: tem matchId? NÃO (é standalone)
   → Decrementa: standaloneVideosUsed: 1 → 0 ✅
   → Play deletado do banco
   → Arquivo no R2 pode ficar (não é deletado automaticamente)

4. Usuário pode criar novo vídeo
   → Contador está em 0
   → Pode criar normalmente ✅
```

---

## ⚠️ Importante: Arquivo no R2

**Quando deleta um play:**
- ✅ Contador é decrementado no banco
- ⚠️ Arquivo no R2 **não é deletado automaticamente** (fica lá ocupando espaço)

**Se quiser deletar o arquivo do R2 também:**

O código já tem lógica para deletar do R2 em alguns lugares (ex: `update-play-video-url.ts`), mas não no `delete-play.ts`. Se quiser adicionar:

```typescript
// No delete-play.ts, antes de deletar o play
if (play.videoUrl) {
  try {
    const r2Service = new CloudflareR2Service()
    const filename = play.videoUrl.split('/').pop()
    if (filename) {
      await r2Service.deleteVideo(`videos/${filename}`)
    }
  } catch (error) {
    console.warn('Erro ao deletar vídeo do R2:', error)
    // Não falhar se não conseguir deletar
  }
}
```

---

## 📊 Onde Cada Validação Acontece

| Ação | Onde Valida | Onde Conta |
|------|-------------|------------|
| **Criar vídeo** | Middleware `check-usage.ts` (banco) | Controller incrementa (banco) |
| **Deletar vídeo** | Não valida (só decrementa) | Controller decrementa (banco) |
| **Upload para R2** | Não valida | Não conta (só armazena) |
| **Verificar limite** | Middleware `check-usage.ts` (banco) | Lê contador do banco |

---

## ✅ Resumo

1. **Validação**: No banco de dados (tabela `Usage`)
2. **Contagem**: No banco de dados (incrementa/decrementa)
3. **R2**: Apenas armazena arquivos (não valida nem conta)
4. **Ao deletar**: Contador é decrementado automaticamente ✅
5. **Arquivo no R2**: Não é deletado automaticamente (pode ocupar espaço)

---

## 🔧 Melhorias Futuras (Opcional)

Se quiser deletar arquivos do R2 ao deletar plays:

1. Adicionar lógica no `delete-play.ts` para deletar do R2
2. Adicionar lógica no `delete-match.ts` para deletar todos os vídeos dos plays

Mas isso é **opcional** - o importante é que o contador já é decrementado corretamente! ✅

