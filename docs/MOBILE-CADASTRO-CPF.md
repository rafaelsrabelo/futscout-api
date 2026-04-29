# Cadastro com CPF e Reativação de Atletas Importados — Mobile

Documento para o time mobile aplicar as mudanças de fluxo de **cadastro** e **recuperação de acesso** após a refatoração que moveu o `cpf` para o `User` e adicionou a flag `isImported`.

> **Resumo executivo:** o CPF agora faz parte do cadastro do usuário (`POST /auth/users`), não mais do perfil de atleta/observer. Atletas importados via planilha (placeholder `cpf@futscore.club`) podem reivindicar a conta digitando o CPF no cadastro — o backend reconhece, atualiza email/senha/nome e envia o código de verificação para o email novo.

---

## Contexto

99% dos cadastros atuais foram criados via script de importação de planilha, com email placeholder no formato `<cpf>@futscore.club` e senha temporária = CPF. Esses usuários estão marcados com `isImported: true`.

A tela de cadastro do app agora deve:
1. Pedir CPF antes de qualquer outro dado.
2. Verificar se o CPF já existe via `POST /auth/check-cpf` (opcional — só pra UX).
3. Mandar o cadastro completo via `POST /auth/users`. O backend decide entre **criar novo** ou **reativar importado** automaticamente.
4. Para usuários que já reivindicaram a conta antes mas esqueceram a senha, oferecer recuperação via `POST /auth/recover-access`.

---

## Endpoints

Base URL: `/api`

### 1. `POST /auth/check-cpf` (público, opcional)

Verifica se o CPF já está cadastrado. **Não revela dados sensíveis**, apenas `true/false`. Usado para mostrar mensagem na tela ("já tem cadastro com este CPF").

#### Request

```http
POST /api/auth/check-cpf
Content-Type: application/json

{
  "cpf": "974.563.215-58"
}
```

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `cpf` | string | ✅ | Pode vir com máscara — backend normaliza |

#### Response 200

```json
{
  "exists": true
}
```

#### Status codes

| Código | Quando |
|--------|--------|
| `200` | Sempre que a requisição for válida |
| `400` | CPF ausente ou com menos de 11 dígitos |

#### Exemplo de uso (UX sugerida)

- `exists: false` → segue cadastro normal.
- `exists: true` → mostra: *"Encontramos um cadastro com esse CPF. Continue para ativar sua conta — o email e senha que você usar substituirão o cadastro existente."* + botão "Continuar".

---

### 2. `POST /auth/users` (público) — **principal**

Cria um novo usuário **ou** reativa um cadastro importado, dependendo se o CPF já existe na base.

#### Request

```http
POST /api/auth/users
Content-Type: application/json

{
  "name": "João da Silva",
  "email": "joao.silva@gmail.com",
  "password": "minhaSenha123",
  "cpf": "974.563.215-58",
  "role": "ATHLETE"
}
```

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `name` | string | ✅ | Mínimo 1 caractere |
| `email` | string | ✅ | Email válido |
| `password` | string | ✅ | Mínimo 6 caracteres |
| `cpf` | string | ✅ | 11 a 14 caracteres (com ou sem máscara) |
| `role` | string | ❌ | `ATHLETE` (default), `OBSERVER` ou `ADMIN` |

#### Response 201 — cadastro novo

```json
{
  "user": {
    "id": "0a1b2c3d-...",
    "name": "João da Silva",
    "email": "joao.silva@gmail.com",
    "cpf": "97456321558",
    "role": "ATHLETE"
  },
  "reactivated": false
}
```

> Após resposta `201`, mostrar tela de **verificação de email** — o usuário recebeu um código de 6 dígitos por email e precisa enviar via `POST /auth/verify-email`.

#### Response 200 — reativação de cadastro importado

```json
{
  "user": {
    "id": "abc-def-...",
    "name": "João da Silva",
    "email": "joao.silva@gmail.com",
    "cpf": "97456321558",
    "role": "ATHLETE"
  },
  "reactivated": true
}
```

> Mesma tela de verificação de email. A diferença é só o status code (200 vs 201) e a flag `reactivated`. Use `reactivated` se quiser exibir uma mensagem diferente: *"Bem-vindo de volta! Confirme seu email para continuar."*

#### Status codes

| Código | Significado | Mensagem do servidor |
|--------|-------------|----------------------|
| `201` | Criado novo usuário | — |
| `200` | Reativado usuário importado | — |
| `400` | CPF inválido | `CPF inválido.` |
| `409` | CPF já cadastrado em conta ativa (não importada) | `CPF já cadastrado.` |
| `409` | Email já em uso por outro usuário | `Email already exists` |

#### Mensagens sugeridas no app

- `400`: *"CPF informado é inválido. Verifique e tente novamente."*
- `409 - CPF`: *"Este CPF já está em uso. Se for sua conta, recupere o acesso pela tela de login."* (com botão pra `recover-access`)
- `409 - Email`: *"Este email já está vinculado a outra conta."*

---

### 3. `POST /auth/recover-access` (público)

Para quem já reivindicou a conta antes mas perdeu o acesso. Valida `cpf + birthDate` e envia uma senha temporária para o email informado.

#### Request

```http
POST /api/auth/recover-access
Content-Type: application/json

{
  "email": "novo.email@gmail.com",
  "cpf": "974.563.215-58",
  "birthDate": "2002-04-15"
}
```

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| `email` | string | ✅ | Email para receber a senha temporária |
| `cpf` | string | ✅ | CPF cadastrado |
| `birthDate` | string | ✅ | ISO 8601 — `"2002-04-15"` ou `"2002-04-15T00:00:00.000Z"` |

#### Response 200

```json
{
  "message": "Senha enviada para o email informado."
}
```

#### Status codes

| Código | Significado |
|--------|-------------|
| `200` | Senha enviada |
| `401` | CPF + data de nascimento não conferem (ou perfil não tem `birthDate` cadastrado) |
| `409` | Email informado já pertence a outro usuário |

> ⚠️ Alguns atletas foram importados **sem `birthDate`** (planilha incompleta). Para esses, o endpoint sempre retornará `401`. Para esses casos, oriente: *"Não foi possível confirmar sua identidade. Entre em contato com o suporte."*

---

### 4. `POST /auth/sessions` (público) — login (sem mudança)

Continua aceitando email **ou** CPF + senha. Só está aqui pra contexto.

```http
POST /api/auth/sessions
{ "cpf": "97456321558", "password": "minhaSenha" }
```

ou

```http
POST /api/auth/sessions
{ "email": "joao.silva@gmail.com", "password": "minhaSenha" }
```

---

## Endpoints que **não recebem mais `cpf`**

Remover o campo do payload nos requests abaixo. O CPF agora vive em `User.cpf` e é exposto no response quando aplicável.

### `POST /athletes/profile`
**Antes:**
```json
{ "cpf": "97456321558", "gender": "MALE", "birthDate": "...", ... }
```

**Agora:**
```json
{ "name": "João", "gender": "MALE", "birthDate": "...", ... }
```

### `POST /observer/profile`
**Antes:** `{ "cpf": "...", "name": "...", "phone": "..." }`
**Agora:** `{ "name": "...", "phone": "..." }`

### `PUT /observer/profile`
Remover o campo `cpf` do payload (era opcional). CPF não é editável via app — só via fluxo de cadastro/reativação.

### `GET /athletes/profile`, `GET /observer/profile`
Continuam retornando `cpf` no JSON de resposta (extraído de `User.cpf`).

---

## User Stories

### US-01 — Cadastro de atleta novo (não está na base)
**Como** atleta que nunca foi importado,
**quero** me cadastrar no app
**para** começar a usar a plataforma.

**Fluxo:**
1. Tela inicial → "Criar conta".
2. App pede **CPF** primeiro.
3. App chama `POST /auth/check-cpf` → retorna `exists: false`.
4. App segue para tela com `name`, `email`, `password`.
5. App chama `POST /auth/users` com todos os campos → recebe `201` + `reactivated: false`.
6. App mostra tela de verificação de email.
7. Usuário recebe código por email, digita, app chama `POST /auth/verify-email`.
8. App segue para `POST /auth/sessions` → recebe tokens, está logado.

### US-02 — Atleta importado reivindica a conta
**Como** atleta importado via planilha (com email `cpf@futscore.club`),
**quero** ativar minha conta com meu email real
**para** acessar minha plataforma.

**Fluxo:**
1. Tela inicial → "Criar conta".
2. App pede **CPF**.
3. App chama `POST /auth/check-cpf` → retorna `exists: true`.
4. App mostra mensagem amigável: *"Encontramos seu cadastro. Informe seu email e crie uma senha pra ativar sua conta."*
5. App segue para tela com `name`, `email`, `password`.
6. App chama `POST /auth/users` → recebe `200` + `reactivated: true`.
7. App mostra tela de verificação de email com mensagem: *"Confirme o código que enviamos para [email]."*
8. Usuário verifica → loga normalmente.

### US-03 — Atleta tenta cadastrar com CPF que já tem conta ativa (não importada)
**Como** alguém com o CPF de outra pessoa que já reivindicou,
**quero** que o sistema bloqueie meu cadastro indevido.

**Fluxo:**
1. App chama `POST /auth/users` com CPF de conta ativa.
2. Backend retorna `409` com `message: "CPF já cadastrado."`
3. App mostra: *"Este CPF já está em uso. Se for sua conta, recupere seu acesso."* + botão "Recuperar acesso".
4. Botão leva para tela de `recover-access`.

### US-04 — Atleta importado esqueceu a senha após ativar
**Como** atleta que já ativou a conta mas esqueceu a senha,
**quero** receber uma senha temporária no meu email cadastrado
**para** voltar a acessar.

**Fluxo:**
1. Tela de login → "Esqueci minha senha".
2. App pede CPF, data de nascimento e email para envio.
3. App chama `POST /auth/recover-access`.
4. `200` → mostra "Verifique seu email" e volta pra tela de login.
5. `401` → mostra "Os dados não conferem".

### US-05 — Atleta importado **sem `birthDate` no cadastro**
**Como** atleta que foi importado sem data de nascimento,
**preciso** de um caminho alternativo de recuperação.

**Fluxo:**
1. App tenta `recover-access` → recebe `401`.
2. App exibe: *"Não foi possível verificar sua identidade automaticamente. Entre em contato com o suporte."* + link/email do suporte.

### US-06 — Cadastro de observador
**Como** observador (olheiro/empresário),
**quero** me cadastrar
**para** acessar a área de observador.

**Fluxo:**
1. Mesmo de US-01, mas `role: "OBSERVER"` no `POST /auth/users`.
2. Após verificar email, app chama `POST /observer/profile` com `{ name, phone, currentClub?, profilePhoto? }` — **sem `cpf`**.

---

## Mudanças no contrato de respostas

### `GET /auth/me`
Sem mudança no shape — agora `user.cpf` está disponível (era populado por `athleteProfile.cpf` antes).

### `GET /athletes/profile`
O campo `cpf` agora vem de `User.cpf`. Pode ser `null` para usuários legados que ainda não foram migrados.

### `GET /admin/athletes`
Cada item da lista tem `cpf` agora vindo de `user.cpf`. Tipo mudou de `string` para `string | null`.

---

## Checklist para o Mobile

### Tela de cadastro
- [ ] Adicionar input de CPF como **primeiro campo** (ou logo após nome).
- [ ] Validar CPF localmente (algoritmo padrão BR) antes de enviar.
- [ ] Aceitar entrada com ou sem máscara, mas enviar sempre o que o usuário digitou (servidor normaliza).
- [ ] (Opcional) Chamar `POST /auth/check-cpf` no `onBlur` do CPF para feedback instantâneo.
- [ ] Tratar `reactivated: true` no response do `POST /auth/users` para mostrar mensagem diferenciada.

### Tela de criação de perfil de atleta
- [ ] **Remover** o campo `cpf` do formulário.
- [ ] **Remover** o campo `cpf` do payload do `POST /athletes/profile`.

### Tela de criação/edição de observador
- [ ] **Remover** o campo `cpf` do formulário.
- [ ] **Remover** o campo `cpf` do payload de `POST /observer/profile` e `PUT /observer/profile`.

### Tela de "esqueci minha senha"
- [ ] Inputs: email (destinatário), CPF, data de nascimento.
- [ ] Submit: `POST /auth/recover-access`.
- [ ] Tratar 401 com mensagem amigável.

### Tela de login
- [ ] Continuar funcionando (sem mudança no contrato).
- [ ] Pode adicionar atalho "É a primeira vez? Crie sua conta com CPF" para guiar atletas importados.

---

## Erros e mensagens — referência rápida

| HTTP | Endpoint | `message` do servidor | Mensagem amigável sugerida |
|------|----------|------------------------|----------------------------|
| 400 | `POST /auth/users` | `CPF inválido.` | "CPF informado é inválido." |
| 409 | `POST /auth/users` | `CPF já cadastrado.` | "Este CPF já está em uso. Se for sua conta, recupere o acesso." |
| 409 | `POST /auth/users` | `Email already exists` | "Este email já está vinculado a outra conta." |
| 401 | `POST /auth/recover-access` | `CPF e data de nascimento não conferem.` | "Os dados informados não conferem. Verifique e tente novamente." |
| 409 | `POST /auth/recover-access` | `Email already exists` | "Esse email já pertence a outra conta." |
| 400 | `POST /auth/check-cpf` | (zod error) | "Informe um CPF válido." |

---

## Glossário técnico

| Termo | Significado |
|-------|-------------|
| `isImported` | Flag interna no backend. `true` = cadastro veio da planilha de importação e ainda não foi reivindicado. Não vai pro response. |
| `reactivated` | Flag no response do `POST /auth/users`. `true` = o cadastro existia como `isImported` e foi reivindicado nessa requisição. |
| Cadastro placeholder | Cadastro criado via script com email no formato `<cpf>@futscore.club` e senha temporária = CPF. Tem `isImported: true` até alguém reivindicar via register. |
| Reativação | Operação que substitui email/senha/nome de um cadastro `isImported`, marca `isImported: false` e dispara verificação por email. |

---

## Suporte

Dúvidas sobre contrato/erros: chamar o backend (Rafael).
Bug em produção: abrir issue com `cpf`, `email`, `endpoint` e `request id` (se disponível).
