# 🔐 Documentação: Autenticação do Admin

## Visão Geral

O admin não tem um fluxo de autenticação separado — ele reaproveita os endpoints existentes de credenciais. A única diferença é que o usuário tem `role = 'ADMIN'` no banco, o que é refletido no payload do JWT emitido no login.

- **Login:** `POST /api/auth/sessions` (mesmo endpoint dos atletas/olheiros)
- **Sessão atual:** `GET /api/auth/me`
- **Logout:** `DELETE /api/auth/sessions` (adiciona o token na blacklist)
- **Refresh:** `POST /api/auth/refresh`
- **Verificação admin-only:** `GET /api/admin/auth/verify` (este documento)

Rotas `/api/admin/*` são protegidas por `{ onRequest: [verifyJwt, verifyAdmin] }`. Usuários com `role !== 'ADMIN'` recebem `403`.

Políticas gerais (blacklist de token, hash bcrypt, regras de JWT) estão em `ai/rules/security.md`.

---

## ⚙️ Variáveis de Ambiente

| Variável | Ambiente | Tipo | Descrição |
|----------|----------|------|-----------|
| `ADMIN_EMAIL` | obrigatório em `dev`/`test`, opcional em `production` | email | Email do admin padrão criado no boot. |
| `ADMIN_PASSWORD` | obrigatório em `dev`/`test`, opcional em `production` | string (mín. 8 chars) | Senha em texto plano. Será hasheada com bcrypt no boot. |

**Importante:** em produção as vars são opcionais para permitir boots subsequentes sem reenvio de secrets. Se ambas estiverem ausentes e não existir admin no banco, o boot loga um aviso e segue sem criar o admin.

---

## 🌱 Seed Automático no Boot

No startup, `src/server.ts` chama `seedAdmin()` logo após `seedPlans()`. A função é idempotente:

1. Consulta o banco por qualquer `User` com `role = 'ADMIN'`.
2. Se já existir, retorna silenciosamente.
3. Se não existir e `ADMIN_EMAIL` + `ADMIN_PASSWORD` estiverem presentes, cria um `User` com:
   - `role = 'ADMIN'`
   - `provider = 'CREDENTIALS'`
   - `emailVerified = true`, `isActive = true`, `isProfile = true`
   - senha hasheada com `bcrypt(..., 6)`
4. Se não existir e as vars estiverem ausentes, loga aviso e retorna.

O arquivo `src/setup/admin.ts` é a referência. Seus testes estão em `src/setup/admin.spec.ts`.

---

## 🔑 Login do Admin

### Endpoint

```
POST /api/auth/sessions
```

**Autenticação:** Não requerida (gera a sessão).

### Payload

```json
{
  "email": "admin@futscout.com",
  "password": "super-secret-123"
}
```

O endpoint também aceita login por CPF (`{ "cpf": "00011122233", "password": "..." }`), mas o admin padrão é criado só com email — então use email.

### Resposta `200 OK`

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "a9f1...c3e",
  "expiresIn": "15m"
}
```

O `accessToken` carrega `{ sub: <userId>, role: 'ADMIN' }` no payload.

### Erros

| Status | Cenário |
|--------|---------|
| `400`  | Validação (email/senha ausentes ou formato inválido). |
| `401`  | Credenciais inválidas (mesmo erro para email inexistente e senha errada, por design). |

---

## 🛡️ `GET /api/admin/auth/verify`

Endpoint leve usado pelo frontend admin para validar a sessão no carregamento inicial.

### Endpoint

```
GET /api/admin/auth/verify
```

**Autenticação:** JWT no header `Authorization: Bearer <accessToken>` + `role === 'ADMIN'`.

### Resposta `200 OK`

```json
{
  "userId": "b4d9...e1",
  "email": "admin@futscout.com",
  "role": "ADMIN"
}
```

### Erros

| Status | Cenário |
|--------|---------|
| `401`  | Token ausente, expirado ou revogado (via blacklist). |
| `403`  | Token válido, mas `role !== 'ADMIN'`. |
| `404`  | Usuário do token não existe mais no banco (conta deletada). |

---

## 🔄 Rotação de Senha em Produção

O `seedAdmin()` é idempotente e **não atualiza** a senha de um admin existente. Para rotacionar a senha do admin em produção:

1. Gerar o hash bcrypt da nova senha (localmente):
   ```bash
   node -e 'require("bcryptjs").hash("nova-senha-123", 6).then(console.log)'
   ```
2. Conectar no banco de produção e atualizar direto na tabela `users`:
   ```sql
   UPDATE users
   SET password = '<hash>', updated_at = NOW()
   WHERE role = 'ADMIN'
     AND email = 'admin@futscout.com';
   ```
3. Revogar todos os refresh tokens do admin para forçar novo login:
   ```sql
   DELETE FROM refresh_tokens
   WHERE user_id = (SELECT id FROM users WHERE role = 'ADMIN' AND email = 'admin@futscout.com');
   ```

Não é necessário reiniciar o processo — o próximo login usa o hash atualizado. Atualizar `ADMIN_PASSWORD` no ambiente é opcional (só afeta o seed de novos ambientes).

---

## 📝 Notas de Implementação

- Arquivos tocados: `src/env/index.ts` (vars), `src/setup/admin.ts` (seed), `src/server.ts` (chamada), `src/http/middlewares/verify-admin.ts` (gate de role), `src/http/controllers/admin/verify-admin-session.ts` (endpoint), `src/http/routes.ts` (registro).
- Convenções: mensagens de erro em PT-BR, identificadores e logs em EN (ver `ai/rules/security.md` e `ai/context/coding-style.md`).
- Segurança: a senha do admin **nunca** aparece em logs nem em respostas HTTP. O hash tampouco é exposto.
