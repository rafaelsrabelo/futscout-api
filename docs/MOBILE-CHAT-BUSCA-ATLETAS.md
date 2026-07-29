# Chat de Busca de Atletas (IAFutscore) — Mobile

Documento para o time mobile integrar a tela **Helper IA** do observador com o backend real.

> **Resumo executivo:** o observador para de preencher formulário de filtros e passa a **conversar**. Ele descreve quem procura, a IA monta os filtros, busca na base e devolve os atletas como cards dentro da conversa. Quando ele gosta do resultado, pede para salvar, a IA pergunta o nome e grava uma `SavedSearch` — a **mesma** entidade que o formulário gravava. Ou seja: as telas de buscas salvas e de resultados **continuam funcionando sem mudança**. O que muda é só como a busca nasce.
>
> No app já existe a UI do chat em `viewModels/HelperIA/` — hoje ela responde com `MOCK_REPLIES` + `setTimeout`. Esta doc é o que precisa para trocar o mock pelo endpoint real.

---

## O fluxo completo

| # | Passo | Endpoint |
|---|---|---|
| 1 | Observador abre o chat e descreve o que procura | `POST /api/scout-chat/messages` |
| 2 | IA pergunta o que faltar, busca, devolve cards | mesmo endpoint (um turno por mensagem) |
| 3 | Observador refina ("abre até 22 anos") | mesmo endpoint, com `threadId` |
| 4 | Observador pede para salvar → IA pergunta o nome | mesmo endpoint |
| 5 | Ele diz o nome → IA salva | mesmo endpoint, resposta traz `savedSearchId` |
| 6 | Lista as buscas salvas dele | `GET /api/saved-searches` *(já existe)* |
| 7 | Vê os atletas de uma busca salva | `GET /api/saved-searches/:id/execute` *(já existe)* |

Tudo é `Authorization: Bearer <accessToken>` e **exclusivo de `role: OBSERVER`** — atleta ou admin recebe **403**.

---

## 1. Conversar — `POST /api/scout-chat/messages`

O endpoint principal. **Uma chamada = um turno** (uma mensagem do observador + uma resposta da IA). Não é streaming: a resposta vem completa, use o `isTyping` que já existe como loading.

### Request

```http
POST /api/scout-chat/messages
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "message": "quero atacante canhoto sub-20",
  "threadId": null
}
```

| Campo | Tipo | Obrigatório | Nota |
|---|---|---|---|
| `message` | string (1–1000) | sim | O texto do observador, cru. |
| `threadId` | uuid \| null | não | **Omita ou mande `null` na primeira mensagem** — o backend cria a conversa e devolve o id. Nas seguintes, mande o `threadId` que recebeu, senão cada mensagem abre uma conversa nova e a IA perde o contexto. |

### Response 200

```json
{
  "threadId": "3f8a...uuid",
  "turnId": "9c2b...uuid",
  "messageId": "7d1c...uuid",
  "response": "Achei 7 atacantes canhotos até 20 anos. Quer que eu abra a idade até 22?",
  "responseType": "ATHLETE_LIST",
  "items": [
    {
      "id": "uuid-do-athleteProfile",
      "userId": "uuid-do-user",
      "name": "João Vitor Andrade Barbosa",
      "nickname": "joo6354",
      "profilePhoto": "https://r2.../foto.jpg",
      "primaryPosition": "FORWARD",
      "secondaryPosition": null,
      "age": 19,
      "height": 1.78,
      "weight": 75,
      "dominantFoot": "LEFT",
      "currentClub": "Bragantino"
    }
  ],
  "appliedFilters": {
    "primaryPosition": "FORWARD",
    "dominantFoot": "LEFT",
    "maxAge": 20
  },
  "filterSummary": "Atacante · canhoto · até 20 anos",
  "savedSearchId": null,
  "meta": { "tokensUsed": 1240, "cachedTokens": 980 }
}
```

| Campo | Para que serve no app |
|---|---|
| `response` | O texto da bolha da IA. **Renderize como veio** — já vem sem travessão de robô e sem id vazado. |
| `responseType` | Diz **como renderizar** o turno. Ver tabela abaixo. |
| `items` | Os cards de atleta. Vem `[]` quando o turno foi só conversa. Sempre montado pelo backend — nunca é texto do modelo. |
| `appliedFilters` | Os critérios valendo agora. Útil para mostrar um resumo tipo "Atacante · canhoto · até 20 anos" acima da conversa. |
| `savedSearchId` | Só vem preenchido no turno em que a busca foi salva. |
| `meta` | Telemetria. Pode ignorar na UI. |

### Os `responseType`

| Valor | O que fazer |
|---|---|
| `TEXT` | Só a bolha de texto. |
| `CLARIFY` | Só a bolha. É a IA pedindo um critério que falta ("qual posição?"). Vale destacar visualmente que ela está esperando resposta. |
| `ATHLETE_LIST` | Bolha + **lista de cards** de `items`. O caso principal. |
| `ATHLETE_DETAIL` | Bolha + **um card expandido** (`items` tem 1 item). É quando ele perguntou sobre um jogador específico da lista. |
| `SEARCH_SAVED` | Bolha + confirmação de busca salva. Use o `savedSearchId` para oferecer "ver minhas buscas". |
| `FALLBACK` | Bolha. A IA se perdeu no turno. Sugira reformular. |

> **Não invente lista a partir do texto.** O `responseType` é derivado no backend a partir dos cards que existem de fato, justamente para o app não precisar adivinhar. Se `responseType` não for `ATHLETE_LIST`/`ATHLETE_DETAIL`, `items` é `[]`.

### Erros

| Status | Quando | O que mostrar |
|---|---|---|
| **429** | Muitas mensagens em pouco tempo (12/min ou 120/hora por usuário) | Aviso temporário, **não** de upgrade. O body traz `{ message, retryAfterSeconds }` e o header `Retry-After`. Desabilite o envio por esse tempo em vez de deixar o usuário tentar de novo à toa. |
| **403** | Usuário não é `OBSERVER` | Não deve acontecer se o chat só existe na visão observador. |
| **404** | `threadId` não existe **ou é de outro usuário** | Limpe o `threadId` local e comece conversa nova. |
| **503** | Chat desligado no servidor (sem chave da OpenAI) | "Chat indisponível no momento". Não é erro do usuário, não sugira reformular. |
| **400** | `message` vazia ou > 1000 chars | Valide no cliente antes de enviar. |

---

## 1b. Salvar um filtro específico — `POST /api/scout-chat/messages/:messageId/save-search`

**Este é o caminho principal para salvar.** Cada turno que fez busca vira um bloco próprio na conversa, com seu `messageId` e seu `filterSummary`. O observador vê o bloco, toca em "salvar", dá um nome — e pronto.

```http
POST /api/scout-chat/messages/7d1c.../save-search
{ "title": "Atacantes canhotos", "description": "Para a base do sub-20" }

→ 201 { "savedSearch": { "id": "...", "title": "...", "filters": {...}, ... } }
```

Por que existe, tendo a IA a tool `save_search`: aqui **não há chamada ao modelo**. É determinístico, instantâneo, de graça, e salva exatamente o filtro que estava na tela — sem depender da IA relembrar os critérios corretamente.

Depois de salvar, o `savedSearchId` fica gravado naquele turno: ao reabrir a conversa por `GET /threads/:id`, o bloco já vem marcado como salvo.

| Status | Quando |
|---|---|
| **400** | O turno não fez busca (era uma pergunta da IA, por exemplo). Não ofereça o botão "salvar" quando `appliedFilters` for `null`. |
| **404** | Mensagem inexistente ou de conversa de outro usuário. |

A tool `save_search` continua funcionando para quem prefere pedir falando ("salva essa busca como X"), mas o botão é o caminho recomendado.

---

## 2. Histórico de conversas

### `GET /api/scout-chat/threads`

```json
{
  "threads": [
    {
      "id": "3f8a...uuid",
      "title": "quero atacante canhoto sub-20",
      "status": "OPEN",
      "createdAt": "2026-07-28T12:00:00.000Z",
      "updatedAt": "2026-07-28T12:04:00.000Z"
    }
  ]
}
```

Ordenado por `updatedAt` desc. O `title` é derivado automaticamente da **primeira** mensagem do observador (até 60 chars) — serve de rótulo na lista.

### `GET /api/scout-chat/threads/:id`

Reabre uma conversa inteira. **Os cards vêm do snapshot gravado no turno** — reabrir não refaz a busca nem re-cobra token, e mostra exatamente o que foi mostrado na hora.

```json
{
  "thread": { "id": "...", "title": "...", "status": "OPEN", "createdAt": "...", "updatedAt": "..." },
  "messages": [
    { "id": "...", "role": "USER", "content": "quero atacante canhoto sub-20", "items": [], "responseType": null, "savedSearchId": null, "createdAt": "..." },
    {
      "id": "...", "role": "ASSISTANT", "content": "Achei 7...",
      "items": [ { /* AthleteCard */ } ],
      "responseType": "ATHLETE_LIST",
      "appliedFilters": { "primaryPosition": "FORWARD", "dominantFoot": "LEFT", "maxAge": 20 },
      "filterSummary": "Atacante · canhoto · até 20 anos",
      "savedSearchId": null,
      "createdAt": "..."
    }
  ],
  "appliedFilters": { "primaryPosition": "FORWARD", "dominantFoot": "LEFT", "maxAge": 20 }
}
```

Cada mensagem carrega **os filtros daquele turno**. É isso que permite renderizar a conversa como uma sequência de buscas — cada uma com seu chip e seu botão de salvar. O `appliedFilters` no topo do objeto é só o último, para o app mostrar o "filtro atual".

`role` é `USER` ou `ASSISTANT`. Renderize na ordem que veio (cronológica). Para continuar a conversa, mande o `thread.id` como `threadId` no próximo `POST /messages`.

### `DELETE /api/scout-chat/threads/:id`

**204**. Arquiva (`status: CLOSED`), não apaga — as mensagens guardam os critérios que geraram buscas salvas. Na prática, some da lista se você filtrar por `status === 'OPEN'`.

---

## 3. Buscas salvas — o que já existe e não muda

Estes endpoints são os mesmos que o formulário usava. O `savedSearches.service.ts` e a tela `saved-search-results.tsx` **continuam válidos**.

| Método | Rota | Nota |
|---|---|---|
| `GET` | `/api/saved-searches` | Lista as buscas do observador. |
| `GET` | `/api/saved-searches/:id/execute?page=1&limit=20` | **É GET, não POST.** Devolve `{ athletes, totalCount, searchTitle }`. |
| `PUT` | `/api/saved-searches/:id` | Editar título/descrição/filtros. |
| `DELETE` | `/api/saved-searches/:id` | Remover. |
| `POST` | `/api/saved-searches` | Criar à mão. **Continua existindo**, mas o fluxo novo é criar pelo chat. |

### Mudanças no contrato de `execute` — atualize seu tipo

O atleta devolvido por `execute` agora traz três campos novos, para bater com o card do chat:

```diff
  {
    "id": "...", "userId": "...", "gender": "MALE",
    "nickname": "joo6354", "profilePhoto": "...",
    "height": 1.78, "weight": 75,
    "dominantFoot": "RIGHT", "primaryPosition": "FORWARD",
+   "secondaryPosition": null,
+   "classification": "PERFORMANCE",
+   "age": 19,
    "currentClub": "Bragantino", "hasManager": false,
    "user": { "id": "...", "name": "...", "role": "ATHLETE", "isActive": true },
    "createdAt": "..."
  }
```

> **Importante:** `gender`, `height`, `weight`, `dominantFoot`, `primaryPosition` e `user.role` **podem vir `null`**. Sempre puderam — o tipo do backend estava mentindo. Perfis criados por importação em massa costumam ter só nome. Trate o null na UI (o card do chat tem o mesmo comportamento).

E o `filters` de `POST`/`PUT /saved-searches` agora aceita `secondaryPosition`, `classification`, `minAge` e `maxAge`. Se você editar uma busca criada pelo chat, **mande o objeto de filtros completo** — o que não vier é sobrescrito.

---

## 4. O que a IA consegue e o que não consegue filtrar

Isto define o que prometer ao usuário. A base só filtra por:

| Critério | Valores |
|---|---|
| `primaryPosition` / `secondaryPosition` | `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD` |
| `gender` | `MALE`, `FEMALE`, `OTHER` |
| `dominantFoot` | `RIGHT`, `LEFT` |
| `minAge` / `maxAge` | anos |
| `minHeight` / `maxHeight` | metros (`1.75`) |
| `minWeight` / `maxWeight` | kg |
| `currentClub` | nome do clube, busca parcial |
| `name` / `nickname` | busca parcial |
| `hasManager` | tem empresário ou não |
| `classification` | `DESENVOLVIMENTO`, `PERFORMANCE` |

Categoria de base **não** é filtro próprio: "sub-17" a IA converte para `maxAge: 17`.

**Não existe** filtro por velocidade, número de gols, cidade/estado, bola parada, "tem vídeo recente". Se o observador pedir, a IA diz com franqueza que não dá e oferece o mais próximo.

> ✅ Os quatro `HELPER_IA_SUGGESTIONS` atuais de `useHelperIA.viewModel.ts` estão todos corretos — os quatro critérios existem na base, pode mantê-los.
>
> ⚠️ Só cuidado ao escrever texto novo de onboarding: os `MOCK_REPLIES` que vão ser removidos prometiam *"só quem tem vídeo recente"* e *"de um estado específico"*, e **nenhum dos dois existe**. Não recicle essas frases.

---

## 5. Como a IA se comporta (para calibrar a UX)

- **Não busca com a mão vazia.** Pedido vago ("quero um bom jogador") gera **uma** pergunta objetiva antes (`responseType: CLARIFY`). Com dois critérios claros, ela busca.
- **Uma busca por turno.** Depois de buscar, comenta em uma ou duas frases e pergunta se quer refinar. **Ela nunca lista os atletas em texto** — eles chegam só como cards. Não duplique.
- **Refino é incremental.** "Abre até 22" mantém posição e pé dominante e muda só a idade. O backend guarda os filtros que valiam; a IA não precisa relembrar.
- **Resultado vazio** vira sugestão específica ("posso abrir a idade até 19?"), não um "não achei nada".
- **Salvar é explícito.** Ela só salva quando o observador pede, e pede um nome curto se ele não der. Se ele mandar salvar antes de qualquer busca, ela busca primeiro.
- Tom direto e cordial, pt-BR, frases curtas, sem emoji.

---

## 6. Checklist de implementação no app

**Novo `src/shared/services/scoutChat.service.ts`** — quatro métodos no `futscoutApiClient` (axios normal, sem SSE):

```ts
sendMessage({ message, threadId }): Promise<ScoutTurnResponse>
listThreads(): Promise<{ threads: ScoutThread[] }>
getThread(id): Promise<ScoutThreadDetail>
closeThread(id): Promise<void>
```

**`useHelperIA.viewModel.ts`** — trocar o mock:
- Guardar `threadId` em estado; mandar `null` na primeira mensagem e o id recebido nas seguintes.
- `sendText` passa a `await scoutChat.sendMessage(...)` em vez do `setTimeout`. O `isTyping` já serve de loading.
- `HelperIaMessage` ganha `items: AthleteCard[]`, `responseType` e `savedSearchId`.
- `startNewConversation` limpa o `threadId` (não precisa chamar a API — a thread nova nasce no próximo `POST`).
- Tratar 429 / 503 / 404 conforme a tabela de erros.

**Novo componente `AthleteResultCard`** — renderizado abaixo da bolha da IA quando `items.length > 0`. Toque navega para o perfil do atleta. É o maior trabalho novo de UI. Lembre dos campos anuláveis.

**`AiMessageBubble`** — passa a aceitar os cards como children/slot.

**Opcional, fase 2:** lista de conversas anteriores (`GET /threads` + `GET /threads/:id`), e um chip de "filtro atual" alimentado por `appliedFilters`.

---

## 7. Pré-requisitos do backend

Antes de integrar, confirme com o backend que:

1. A migration `20260728140000_add_scout_chat` foi aplicada no ambiente que você vai usar.
2. `OPENAI_API_KEY` está setada nesse ambiente — sem ela o endpoint responde **503**.

Teste rápido para saber se está de pé:

```bash
curl -X POST http://localhost:3333/api/scout-chat/messages \
  -H "Authorization: Bearer <token de um OBSERVER>" \
  -H 'Content-Type: application/json' \
  -d '{"message":"quero atacante canhoto sub-20"}'
```
