# 🔐 Autenticação do Admin — Guia de Integração Frontend

Este documento é para quem está construindo o app admin que consome esta API. Cobre apenas o que o frontend precisa saber: endpoints, payloads, respostas, erros e padrões de uso.

Para detalhes de implementação backend e ops (seed automático, rotação de senha), veja `docs/AUTENTICACAO-ADMIN.md`.

---

## 🌐 Base URL

```
https://<host>/api
```

Todos os endpoints abaixo são relativos a esse prefixo.

---

## 🔑 Endpoints

### 1. Login

```
POST /api/auth/sessions
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "admin@futscout.com",
  "password": "super-secret-123"
}
```

> O mesmo endpoint atende atletas, olheiros e admins. O que identifica um admin é a `role` no payload do JWT retornado. O frontend admin **não deve aceitar login** se a role retornada não for `ADMIN` (ver passo "Verificação" abaixo).

**Resposta `200 OK`:**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a9f1...c3e",
  "expiresIn": "15m"
}
```

- `accessToken`: JWT de curta duração (15 min por padrão). Envie em `Authorization: Bearer <accessToken>` em todas as chamadas protegidas.
- `refreshToken`: string opaca persistida no banco. Usada só para renovar o access token.
- `expiresIn`: string no formato do `jsonwebtoken` (ex: `"15m"`, `"1h"`). **Não** é o timestamp de expiração.

**Erros:**

| Status | Body (exemplo) | Quando |
|--------|----------------|--------|
| `400`  | `{ "message": "Validation error", "issues": {...} }` | email/senha ausentes ou formato inválido |
| `401`  | `{ "message": "Invalid credentials." }` | email não existe OU senha errada (mensagem genérica por segurança) |

---

### 2. Verificação de Sessão Admin

```
GET /api/admin/auth/verify
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

Use no boot do app admin para confirmar que o token ainda é válido **e** que o usuário é admin. Se o backend invalidou o token (logout, blacklist) ou o usuário deixou de ser admin, o frontend precisa redirecionar para login.

**Resposta `200 OK`:**
```json
{
  "userId": "b4d9...e1",
  "email": "admin@futscout.com",
  "role": "ADMIN"
}
```

**Erros:**

| Status | Quando | Ação frontend |
|--------|--------|---------------|
| `401`  | Token ausente, expirado ou na blacklist | Tentar refresh (endpoint 4) ou redirecionar para login |
| `403`  | Token válido mas `role !== 'ADMIN'` | Limpar tokens e redirecionar para login |
| `404`  | Usuário do token foi deletado | Limpar tokens e redirecionar para login |

---

### 3. Perfil do Usuário Autenticado (opcional)

```
GET /api/auth/me
```

Retorna o perfil completo do usuário autenticado (não restrito a admin). Útil se o app admin precisar de mais campos além de `userId/email/role`.

**Headers:**
```
Authorization: Bearer <accessToken>
```

---

### 4. Refresh do Access Token

```
POST /api/auth/refresh
```

**Body:**
```json
{
  "refreshToken": "a9f1...c3e"
}
```

Chame quando uma requisição retornar `401` com access token expirado. O backend invalida o refresh token antigo e retorna um novo par `accessToken`/`refreshToken`.

**Resposta `200 OK`:** mesma estrutura do login.

**Erros:**

| Status | Quando | Ação frontend |
|--------|--------|---------------|
| `401`  | Refresh token inválido, expirado ou já consumido | Redirecionar para login |

---

### 5. Logout

```
DELETE /api/auth/sessions
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

Adiciona o access token atual à blacklist e remove o refresh token associado. O frontend deve limpar os tokens armazenados em seguida.

**Resposta `200 OK`:** corpo vazio ou mensagem de confirmação.

Há também `DELETE /api/auth/sessions/all` que revoga **todos** os refresh tokens do usuário (logout em todos os dispositivos).

---

## 🔄 Fluxo Completo Recomendado

```
1. [App boot]
     ├─ Tem accessToken salvo?
     │     SIM → chama GET /api/admin/auth/verify
     │           ├─ 200 → usuário continua logado; mostra dashboard
     │           ├─ 401 → tenta POST /api/auth/refresh
     │           │         ├─ 200 → salva novo par; retorna passo 1
     │           │         └─ 401 → limpa tokens; redireciona /login
     │           └─ 403/404 → limpa tokens; redireciona /login
     │     NÃO → redireciona /login
     │
2. [Tela de login]
     ├─ Usuário envia email + senha
     ├─ POST /api/auth/sessions
     │     ├─ 200 → salva accessToken + refreshToken
     │     │       → chama GET /api/admin/auth/verify
     │     │       │   ├─ 200 → redireciona /dashboard
     │     │       │   └─ 403 → mostra "este login não tem acesso admin"; limpa tokens
     │     │       
     │     ├─ 400 → mostra erros de validação por campo
     │     └─ 401 → mostra "email ou senha inválidos"
     │
3. [Qualquer chamada protegida]
     ├─ 401 com access token → tenta refresh (ver passo 1)
     ├─ 403 → usuário perdeu permissão admin; logout forçado
     └─ Outros erros → tratamento específico
     
4. [Logout]
     ├─ DELETE /api/auth/sessions
     ├─ Limpa accessToken + refreshToken do storage
     └─ Redireciona /login
```

---

## 💾 Armazenamento de Tokens

Recomendação:

- **Web (admin SPA):** `httpOnly cookie` para o refresh token (definido pelo backend via `Set-Cookie` em um futuro próximo; por enquanto o backend retorna no body) e memória (`useState`/store) para o access token. Evite `localStorage` por exposição a XSS.
- **Desktop / Electron:** secure storage do OS.

Enquanto o backend não define cookies, guarde o refresh token da forma mais segura que seu framework permitir e rotacione sempre que usar.

---

## 🧪 Exemplo — Fetch

```ts
async function loginAdmin(email: string, password: string) {
  const res = await fetch('/api/auth/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    if (res.status === 401) throw new Error('Email ou senha inválidos.')
    if (res.status === 400) throw new Error('Dados de login inválidos.')
    throw new Error('Erro inesperado.')
  }

  const { accessToken, refreshToken } = await res.json()

  const verify = await fetch('/api/admin/auth/verify', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (verify.status === 403) {
    throw new Error('Este login não tem acesso ao painel admin.')
  }

  if (!verify.ok) {
    throw new Error('Falha ao verificar sessão admin.')
  }

  const profile = await verify.json()
  return { accessToken, refreshToken, profile }
}
```

---

## 🧪 Exemplo — Axios com interceptor de refresh

```ts
import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

let accessToken: string | null = null
let refreshToken: string | null = null

export function setTokens(next: { accessToken: string; refreshToken: string }) {
  accessToken = next.accessToken
  refreshToken = next.refreshToken
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true
      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        setTokens(data)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        setTokens({ accessToken: '', refreshToken: '' })
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
```

---

## 🚨 O que o Frontend NÃO Deve Fazer

- **Não** decodificar o JWT para "confiar" na role retornada no token. Sempre confirme via `GET /api/admin/auth/verify` — a role pode ter mudado no banco.
- **Não** enviar o refresh token em chamadas normais. Ele só vai para `POST /api/auth/refresh`.
- **Não** mostrar a mensagem de erro do backend literalmente sem filtrar — em vários casos retornamos mensagens genéricas por segurança (`"Invalid credentials."`). Traduza para algo amigável ao usuário.
- **Não** assumir que uma resposta `200` do login implica que o usuário é admin. Um atleta pode se logar no mesmo endpoint.

---

## 📬 Dúvidas

Canais internos. Referência técnica completa: `docs/AUTENTICACAO-ADMIN.md` neste repositório.
