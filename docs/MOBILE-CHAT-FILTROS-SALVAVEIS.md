# Filtros salváveis no chat — plano de execução mobile

Plano para o time mobile adaptar a tela **Helper IA**, que já está integrada, à mudança que subiu na API.

> **O que muda em uma frase:** cada busca da conversa virou um bloco próprio, com seu filtro visível e seu botão de salvar. Antes só dava para salvar pedindo à IA por texto; agora o observador clica no filtro que está vendo, dá um nome, e pronto.

O contrato completo dos endpoints está em [MOBILE-CHAT-BUSCA-ATLETAS.md](./MOBILE-CHAT-BUSCA-ATLETAS.md). Este documento é só o **delta** — o que fazer, em que ordem.

---

## Por que a mudança existe

O `POST /messages` sempre devolveu os filtros aplicados, mas o histórico (`GET /threads/:id`) colapsava tudo num valor só: a conversa sabia *que* tinha buscado, mas não *qual* filtro pertencia a qual turno. E salvar dependia do observador pedir por texto, o que fazia a IA relembrar os critérios — com risco de salvar uma busca diferente da que ele viu na tela.

Agora cada mensagem carrega o próprio filtro e existe um endpoint direto de salvar, sem IA no caminho.

---

## Tarefa 1 — Atualizar os tipos

**Arquivo:** `src/shared/interfaces/scout-chat.ts`

```diff
 export interface ScoutTurnResponse {
   threadId: string;
   turnId: string;
+  /** Id da mensagem do assistente — é por ele que se salva ESTE filtro. */
+  messageId: string;
   response: string;
   responseType: ScoutResponseType;
   items: AthleteCard[];
   appliedFilters: ScoutSearchFilters | null;
+  /** Os mesmos filtros em pt-BR: "Meio-campista · sem empresário". */
+  filterSummary: string | null;
   savedSearchId: string | null;
   meta?: { tokensUsed?: number; cachedTokens?: number };
 }

 export interface ScoutThreadMessage {
   id: string;
   role: 'USER' | 'ASSISTANT';
   content: string;
   items: AthleteCard[];
   responseType: ScoutResponseType | null;
+  appliedFilters: ScoutSearchFilters | null;
+  filterSummary: string | null;
   savedSearchId: string | null;
   createdAt: string;
 }
```

E o tipo do novo endpoint:

```ts
export interface SaveSearchFromMessageParams {
  messageId: string;
  title: string;
  description?: string;
}

export interface SaveSearchFromMessageResponse {
  savedSearch: {
    id: string;
    title: string;
    description: string | null;
    filters: ScoutSearchFilters;
    isActive: boolean;
    createdAt: string;
  };
}
```

> **Não monte o texto do filtro no app.** O `filterSummary` vem pronto do backend justamente para não existirem duas traduções de `MIDFIELDER` → "Meio-campista". Quando entrar um filtro novo, ele aparece sozinho nos dois lugares.

---

## Tarefa 2 — Método novo no service

**Arquivo:** `src/shared/services/scoutChat.service.ts`

```ts
/** Salva os filtros de UM turno. Não passa pela IA — é imediato. */
export const saveSearchFromMessage = async ({
  messageId,
  title,
  description,
}: SaveSearchFromMessageParams): Promise<SaveSearchFromMessageResponse> => {
  try {
    const response = await futscoutApiClient.post<SaveSearchFromMessageResponse>(
      `/scout-chat/messages/${messageId}/save-search`,
      { title: title.trim(), ...(description ? { description } : {}) }
    );
    return response.data;
  } catch (error: unknown) {
    throw toScoutChatError(error);
  }
};
```

O `toScoutChatError` que já existe cobre os status deste endpoint: **404** → `THREAD_NOT_FOUND`, **400** → `INVALID`, **403** → `FORBIDDEN`. A mensagem da API já vem em pt-BR e pode ser exibida direto.

Validar `title` no cliente antes de enviar: 1 a 100 caracteres.

---

## Tarefa 3 — Estado e ação no viewModel

**Arquivo:** `src/viewModels/HelperIA/useHelperIA.viewModel.ts`

**3.1** — `HelperIaMessage` ganha três campos:

```diff
 export interface HelperIaMessage {
   id: string;
   role: 'user' | 'assistant';
   text: string;
   items?: AthleteCard[];
   responseType?: ScoutResponseType | null;
+  /** Id no backend. Só existe em turnos do assistente vindos da API. */
+  messageId?: string;
+  appliedFilters?: ScoutSearchFilters | null;
+  filterSummary?: string | null;
   savedSearchId?: string | null;
   isError?: boolean;
   errorKind?: ScoutChatErrorKind;
 }
```

> O `id` local (`msg-1`, `msg-2`) continua sendo a key da lista. O `messageId` é outro identificador, o do backend — **não misture os dois**.

**3.2** — Guardar os campos novos ao receber o turno, dentro do `appendMessage` que já existe:

```diff
 appendMessage({
   role: 'assistant',
   text: turn.response,
   items: turn.items ?? [],
   responseType: turn.responseType,
+  messageId: turn.messageId,
+  appliedFilters: turn.appliedFilters,
+  filterSummary: turn.filterSummary,
   savedSearchId: turn.savedSearchId,
 });
```

**3.3** — Ação nova `saveFilter`. O ponto importante é o **update local**: depois de salvar, aquele bloco precisa refletir o estado sem refazer requisição.

```ts
const [savingMessageId, setSavingMessageId] = useState<string | null>(null);

const saveFilter = useCallback(
  async (messageId: string, title: string) => {
    setSavingMessageId(messageId);
    try {
      const { savedSearch } = await saveSearchFromMessage({ messageId, title });

      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId ? { ...m, savedSearchId: savedSearch.id } : m
        )
      );

      // A busca nasceu aqui: a home precisa mostrá-la sem esperar o cache
      queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
      return savedSearch;
    } finally {
      setSavingMessageId(null);
    }
  },
  [queryClient]
);
```

Expor `saveFilter` e `savingMessageId` no retorno do hook. O `savingMessageId` é o que deixa o spinner no botão certo quando há vários blocos na tela.

Tratar a falha como as outras: se for `ScoutChatError`, mostrar a mensagem; senão, um texto genérico. Não vale acrescentar uma bolha de erro na conversa aqui — o erro é da ação de salvar, não do turno; um toast ou um estado no próprio botão comunica melhor.

---

## Tarefa 4 — O bloco de filtro na conversa

**Arquivo novo:** `src/components/helper-ia/FilterBlock.tsx`

Renderizado no `footer` do `AiMessageBubble`, **acima** dos cards de atleta. Só aparece quando `appliedFilters` não é nulo.

```
┌──────────────────────────────────────────┐
│  🔍  Meio-campista · sem empresário       │
│                          [ Salvar busca ] │
└──────────────────────────────────────────┘
```

Três estados:

| Estado | Quando | O que mostra |
|---|---|---|
| Salvável | `appliedFilters` existe e `savedSearchId` é nulo | Botão "Salvar busca" |
| Salvando | `savingMessageId === messageId` | Spinner, botão desabilitado |
| Salva | `savedSearchId` preenchido | Selo "Busca salva" + o "Ver minhas buscas" que já existe |

**Não mostre o botão** quando `appliedFilters` for nulo — é um turno em que a IA só conversou ou perguntou algo, e o backend responde **400** se tentar salvar.

---

## Tarefa 5 — Modal para nomear

**Arquivo novo:** `src/components/helper-ia/SaveSearchModal.tsx`

Um `Modal` com input de título (obrigatório, ≤100), descrição opcional (≤500), e os botões Cancelar/Salvar.

> Não use `Alert.prompt`: é **só iOS**, some no Android.

Boa prática: pré-preencher o título com o `filterSummary` do bloco. "Meio-campista · sem empresário" já é um nome utilizável, e o observador só ajusta se quiser.

---

## Tarefa 6 — Ligar na view

**Arquivo:** `src/viewModels/HelperIA/HelperIA.view.tsx`

No `footer` do `AiMessageBubble` que já existe, antes do `items.map(...)`:

```diff
 footer={
   <>
+    {!!message.appliedFilters && !!message.messageId && (
+      <FilterBlock
+        summary={message.filterSummary}
+        isSaved={!!message.savedSearchId}
+        isSaving={savingMessageId === message.messageId}
+        onSave={() => openSaveModal(message.messageId!, message.filterSummary)}
+      />
+    )}
     {items.map((athlete) => ( ... ))}
```

O botão "Ver minhas buscas" que já existe continua condicionado a `savedSearchId` — agora ele acende tanto quando a IA salvou por texto quanto quando o observador salvou pelo botão.

---

## O ciclo completo: salvar → listar → ver os atletas

Vale deixar explícito o que já funciona, porque **quase tudo isto já está pronto** — dos dois lados.

### Salvar — duas portas, mesma `SavedSearch`

| Como | Endpoint | Quando usar |
|---|---|---|
| **Botão no bloco de filtro** | `POST /scout-chat/messages/:messageId/save-search` | Caminho principal. Sem IA, instantâneo, salva o que está na tela. É a Tarefa 3–6 acima. |
| **Pedindo por texto** | tool `save_search`, dentro do `POST /messages` | "salva essa busca como Meias do Ceará". A IA pergunta o nome se não vier junto. Já funciona, nada a fazer. |

As duas gravam a **mesma entidade** que o formulário antigo gravava. Não existe "busca do chat" e "busca do formulário" — é uma coisa só.

### Listar — já funciona, não mexa

`GET /api/saved-searches` já é consumido pelo app:

- `src/shared/services/savedSearches.service.ts` → `getSavedSearches()`
- `src/shared/hooks/useSavedSearches.ts` → `useSavedSearches()`, com `queryKey: ['saved-searches']`
- `src/viewModels/Home/components/SavedSearchesSection.tsx` → a seção na home

É exatamente por isso que a Tarefa 3 invalida `['saved-searches']`: a chave bate com a que o hook já usa, então a busca recém-criada no chat aparece na home **sem reload**.

### Ver os atletas de uma busca — já funciona

`GET /api/saved-searches/:id/execute?page=1&limit=20`, consumido por `useExecuteSavedSearch()` e renderizado em `src/app/(private)/saved-search-results.tsx`.

Ou seja: depois da Tarefa 6, o ciclo fecha sozinho. O observador conversa, salva o filtro no chat, e ele já aparece na home e abre a lista de atletas — sem nenhuma tela nova.

### Duas coisas para conferir nos tipos do app

O chat consegue produzir filtros que o formulário nunca produziu, então vale alinhar:

1. **`SavedSearchFilters`** em `savedSearches.service.ts` não tem `classification`. Se o observador pedir "atletas de performance", a busca salva vai carregar um filtro que o tipo do app desconhece. Acrescente `classification?: 'DESENVOLVIMENTO' | 'PERFORMANCE'`.
2. **`ExecuteSavedSearchResponse`** ganhou `age`, `secondaryPosition` e `classification` — e `gender`, `height`, `weight`, `dominantFoot`, `primaryPosition` e `user.role` **podem vir `null`** (sempre puderam; o tipo do backend é que estava mentindo). Perfis criados por importação em massa costumam ter só nome.

> **Cuidado ao editar uma busca salva pelo app:** o `PUT /saved-searches/:id` substitui o objeto `filters` inteiro. Mande sempre completo — o que não vier é apagado, e uma busca criada no chat perderia a faixa de idade em silêncio.

---

## Tarefa 7 — Histórico (opcional, fase 2)

Se/quando implementarem a lista de conversas anteriores, o `GET /threads/:id` devolve tudo pronto: cada mensagem já vem com `appliedFilters`, `filterSummary` e `savedSearchId`, e os cards vêm do snapshot — reabrir **não** refaz a busca nem gasta token.

Atenção ao mapear: o backend usa `role: 'USER' | 'ASSISTANT'` (maiúsculo) e o viewModel usa `'user' | 'assistant'`.

---

## Ordem sugerida

1. Tarefas 1 e 2 (tipos + service) — mecânico, destrava o resto
2. Tarefa 3 (viewModel) — dá para testar com `console.log` antes de existir UI
3. Tarefas 4, 5 e 6 (UI) — o grosso do trabalho
4. Tarefa 7 quando fizer sentido no roadmap

## Como validar

- Mandar "Meio-campistas sem empresário" → o bloco de filtro aparece acima dos cards com o texto certo
- Salvar → o bloco vira "Busca salva" **sem recarregar a tela**, e a busca aparece na home
- Refinar ("agora só os canhotos") → **dois** blocos na conversa, cada um com seu filtro e seu botão
- Salvar o segundo → só o segundo muda de estado
- Um turno em que a IA só pergunta algo → **nenhum** botão de salvar

---

## Pré-requisito

A API precisa estar respondendo. Houve uma correção grande no motor do chat (tool calling nativo) junto com esta mudança — se o chat não estiver devolvendo atletas, confirme com o backend antes de debugar o app.
