# 👤 Admin — Gestão de Usuários (Frontend)

Guia de integração dos endpoints de **Usuários** do admin. Cobre os 4 endpoints (listar, detalhar, editar, resetar senha), contrato da API e UX sugerida pra tela de listagem + detalhe.

Para autenticação admin, veja `docs/FRONTEND-AUTH-ADMIN.md`.

---

## 🌐 Endpoints

| Método | Rota | O que faz |
|---|---|---|
| `GET` | `/api/admin/users` | Lista paginada de TODOS os usuários (atletas, observadores, sem role) |
| `GET` | `/api/admin/users/:id` | Detalhe completo do usuário |
| `PATCH` | `/api/admin/users/:id` | Edita campos do usuário |
| `POST` | `/api/admin/users/:id/reset-password` | Reseta a senha (qualquer role) |

**Auth (todos):** `Authorization: Bearer <accessToken>` com `role = 'ADMIN'` no JWT.

| Status comum | Quando |
|---|---|
| `401` | Token ausente, expirado ou na blacklist |
| `403` | Token válido, mas o usuário não é admin |
| `400` | Erro de validação no body/query/params |
| `404` | `:id` não corresponde a nenhum usuário |

---

## 1. `GET /api/admin/users` — Listagem

### Query params

| Param | Tipo | Valores | Default |
|---|---|---|---|
| `page` | int | ≥ 1 | `1` |
| `pageSize` | int | 1 – 100 | `20` |
| `q` | string | busca livre em **name** e **cpf** | — |
| `role` | enum | `ATHLETE` \| `OBSERVER` \| `none` | — |

Notas:
- `q` é case-insensitive. Para `name` é match parcial (`contains`); para `cpf`, normaliza pra dígitos antes de comparar (digite com ou sem máscara, tanto faz).
- `role=none` retorna apenas users que ainda **não escolheram** role (cadastraram conta mas não viraram atleta nem olheiro).
- Sem `role` → retorna todas as roles.

### Response 200

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "João Vitor",
      "email": "joao@example.com",
      "cpf": "63545311376",
      "role": "ATHLETE",
      "isActive": true,
      "emailVerified": true,
      "isImported": false,
      "lastLoginAt": "2026-04-28T...",
      "createdAt": "2026-04-28T...",
      "hasAthleteProfile": true,
      "hasObserverProfile": false,
      "activePlan": "PREMIUM"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 137,
    "totalPages": 7
  }
}
```

### Campos derivados

| Campo | Significado |
|---|---|
| `hasAthleteProfile` | Existe registro em `athlete_profiles` para esse user |
| `hasObserverProfile` | Existe registro em `observer_profiles` |
| `activePlan` | `PREMIUM` se tem `Subscription` ativa não-expirada com plano PREMIUM, senão `FREE` |

`role` pode ser `null` (cadastrou e não escolheu role ainda).

### UX sugerida

- **Tabela** com colunas: avatar (iniciais), name + email, cpf, role (chip), plano (chip), status ativo, último login, ações.
- **Filtros** no topo: busca livre + dropdown de role (Todos / Atleta / Olheiro / Sem role).
- **Chip "PREMIUM"** dourado/destaque, "FREE" cinza.
- Linha clicável → vai pra detalhe `/admin/users/:id`.
- Atleta: ao clicar em "Ver perfil" → `/admin/atletas/:athleteProfileId` (usar o id que vem do detalhe). Olheiro: similar (rota futura, ainda não implementada).

---

## 2. `GET /api/admin/users/:id` — Detalhe

### Response 200

```json
{
  "user": {
    "id": "uuid",
    "name": "João Vitor",
    "email": "joao@example.com",
    "cpf": "63545311376",
    "role": "ATHLETE",
    "isActive": true,
    "emailVerified": true,
    "isImported": false,
    "provider": "CREDENTIALS",
    "lastLoginAt": "2026-04-28T...",
    "createdAt": "2026-04-28T...",
    "updatedAt": "2026-04-28T..."
  },
  "athleteProfileId": "uuid-ou-null",
  "observerProfileId": null,
  "activePlan": "PREMIUM"
}
```

### UX sugerida

Tela com card principal "Conta" e botões secundários.

- **Card "Conta"** mostra todos os campos do `user` em formato chave/valor.
- **Botão "Ver perfil de atleta"** aparece quando `athleteProfileId !== null` — leva pra `/admin/atletas/<athleteProfileId>`.
- **Botão "Editar"** abre modal/form com PATCH.
- **Botão "Redefinir senha"** abre modal pequeno → POST reset-password.
- **Botão "Desativar conta"** (atalho) → PATCH com `{ isActive: false }`.

---

## 3. `PATCH /api/admin/users/:id` — Editar

### Body (todos opcionais — manda só o que mudou)

```json
{
  "name": "Nome novo",
  "email": "novo@example.com",
  "cpf": "12345678900",
  "role": "ATHLETE",
  "isActive": true,
  "emailVerified": false,
  "isImported": false
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | trim, 1–120 chars |
| `email` | string | formato válido, normalizado pra lowercase |
| `cpf` | string \| null | aceita com ou sem máscara — backend normaliza pra dígitos. `null` limpa |
| `role` | `'ATHLETE'` \| `'OBSERVER'` \| `null` | `null` desfaz a role (raro) |
| `isActive` | boolean | `false` impede login (lembrar: tokens em uso ainda valem por TTL — pra forçar logout combine com `reset-password`) |
| `emailVerified` | boolean | flag operacional, atalho pra "marcar email como verificado manualmente" |
| `isImported` | boolean | normalmente `false` após o atleta reivindicar a conta — admin pode forçar |

### Status codes específicos

| Código | Mensagem | Quando |
|---|---|---|
| `400` | `CPF inválido.` | Falha nos dígitos verificadores ou formato |
| `404` | `Usuário não encontrado.` | id desconhecido |
| `409` | `E-mail já cadastrado.` | Email pertence a outro usuário |
| `409` | `CPF já cadastrado.` | CPF pertence a outro usuário |

### Response 200

```json
{
  "user": {
    "id": "uuid",
    "name": "...",
    "email": "...",
    "cpf": "...",
    "role": "...",
    "isActive": true,
    "emailVerified": true,
    "isImported": false,
    "updatedAt": "2026-05-04T..."
  }
}
```

> **Aviso de UX:** ao editar CPF, mostrar confirmação dupla. Trocar CPF de uma conta é operação sensível e raramente legítima — vale alertar o admin.

---

## 4. `POST /api/admin/users/:id/reset-password` — Resetar senha

### Body

```json
{ "password": "NovaSenha@123" }
```

Validação: 8–128 chars (sem regra de complexidade hoje — sugiro frontend exigir mais forte).

### Response

`204 No Content` em caso de sucesso.

### Side effects no backend

- Hash bcrypt cost 6 (mesmo padrão das outras telas).
- **Invalida todos os refresh tokens** do usuário → ele será deslogado em todos os dispositivos no próximo refresh.

### UX sugerida

- Modal com campo password + confirmação password.
- Mostrar regra de força mínima (sugestão: ≥ 10 chars com letra, número e símbolo — só client-side).
- Botão "Gerar senha aleatória" com copy-to-clipboard, útil pra repassar via canal seguro.
- Toast de sucesso: "Senha redefinida. O usuário precisará logar novamente em todos os dispositivos."

---

## 🧪 Exemplos de consumo

### Listar atletas com plano premium

```ts
const params = new URLSearchParams({ role: 'ATHLETE', pageSize: '20' })
const res = await fetch(`/api/admin/users?${params}`, {
  headers: { Authorization: `Bearer ${token}` },
})
const { items, pagination } = await res.json()
const onlyPremium = items.filter((u) => u.activePlan === 'PREMIUM')
```

### Buscar por CPF (com ou sem máscara)

```ts
// Os 3 retornam o mesmo resultado:
fetch('/api/admin/users?q=635.453.113-76')
fetch('/api/admin/users?q=63545311376')
fetch('/api/admin/users?q=635453')
```

### Atualizar email

```ts
await fetch(`/api/admin/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ email: 'novo@example.com' }),
})
```

---

## 🔒 Regras de negócio

- **Editar CPF** é privilégio só de admin (já protegido por `verifyAdmin`). Backend valida formato + dígitos antes de salvar.
- **`provider` / `providerId` / `password` / `stripeCustomerId`** **não** são editáveis via `PATCH` — risco operacional.
- **Reset de senha não pede senha atual** — admin tem privilégio. O usuário será forçado a re-login.
- A rota antiga `POST /api/admin/athletes/:athleteProfileId/reset-password` continua funcionando pra compatibilidade com a tela de atleta. Use a nova `/admin/users/:userId/reset-password` no novo menu de Users.

---

## 🏗️ Implementação backend

- Use cases: `src/http/use-cases/admin/{list-users,get-user,update-user,reset-user-password}.ts`
- Controllers: `src/http/controllers/admin/{list-users,get-user,update-user,reset-user-password}.ts`
- Erros: `src/http/use-cases/admin/errors/user-not-found-error.ts` + reutilizados de `src/http/use-cases/errors/`
- Repository: `findManyForAdmin` e `findByIdForAdmin` em `UsersRepository`
