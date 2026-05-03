# ✏️ Admin — Editar Atleta (Frontend)

Guia de integração do endpoint `PATCH /api/admin/athletes/:id` para o time de frontend. Cobre o contrato da API, regras de validação e exemplos de consumo.

Para autenticação, veja `docs/FRONTEND-AUTH-ADMIN.md`.

---

## 🌐 Endpoint

```
PATCH /api/admin/athletes/:id
```

**Auth:** `Authorization: Bearer <accessToken>` com `role = 'ADMIN'` no JWT.

- `401` — token ausente, expirado ou na blacklist.
- `403` — token válido, mas usuário não é admin.
- `404` — atleta não encontrado.
- `409` — conflito (nickname/email/cpf já em uso por outro usuário).
- `400` — erro de validação Zod.

> **Importante:** ações de admin **não consomem cota do plano** do atleta editado. Não há incremento de `Usage` neste endpoint.

---

## 🔑 Path param

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | `AthleteProfile.id` (mesmo id usado em `GET /admin/athletes/:id`) |

---

## 🧾 Body — todos os campos opcionais

A request é **partial update**: envie apenas os campos que mudaram. Campos omitidos não são tocados. Campos enviados como `null` (quando aceitam `null`) limpam o valor no banco.

### Conta (`User`)

| Campo | Tipo | Observações |
|-------|------|-------------|
| `name` | string (min 1) | Nome exibido |
| `email` | string (email) | Único — `409` se já estiver em uso |
| `cpf` | string \| null | 11 a 14 chars · único · enviar `null` para limpar |
| `isActive` | boolean | Ativa/desativa a conta |

### Perfil (`AthleteProfile`)

| Campo | Tipo | Observações |
|-------|------|-------------|
| `nickname` | string (1–50) | Único entre atletas — `409` se duplicado |
| `profilePhoto` | string (URL) | URL pública (R2) |
| `birthDate` | string | Aceita `"2013-02-27"` (date-only) **ou** ISO-8601 completo (`"2013-02-27T00:00:00.000Z"`). Backend normaliza para ISO antes de salvar. Datas inválidas retornam `400`. |
| `gender` | enum | `MALE` \| `FEMALE` \| `OTHER` |
| `height` | number > 0 | Em metros (ex: `1.71`) |
| `weight` | number > 0 | Em kg |
| `dominantFoot` | enum | `RIGHT` \| `LEFT` |
| `primaryPosition` | enum | `GOALKEEPER` \| `DEFENDER` \| `MIDFIELDER` \| `FORWARD` |
| `secondaryPosition` | enum \| null | mesmos valores · `null` para limpar |
| `currentClub` | string \| null | Clube atual · `null` para limpar |
| `biography` | string | Bio livre |
| `hasManager` | boolean | Possui empresário/responsável |
| `managerName` | string \| null | |
| `managerCompany` | string \| null | |
| `managerContact` | string \| null | |
| `hasNutritionist` | boolean | Acompanhamento nutricional |
| `hasPsychologist` | boolean | Acompanhamento psicológico |
| `hasPersonalTrainer` | boolean | Treino personalizado |
| `instagramUrl` | string (URL) | |
| `twitterUrl` | string (URL) | |
| `youtubeUrl` | string (URL) | |

### Endereço (`Address`) — upsert

Envie o objeto `address` com os campos que mudaram. Se o atleta **não** tinha endereço, o backend **cria** com os valores fornecidos (e os ausentes ficam vazios ou com default `country = "Brasil"`). Se já existia, faz `update` parcial.

```ts
address?: {
  zipCode?: string
  street?: string
  number?: string
  complement?: string | null
  district?: string
  city?: string
  state?: string
  country?: string  // default "Brasil"
}
```

---

## 📦 Resposta `200 OK`

```json
{
  "profile": {
    "id": "athlete-uuid",
    "userId": "user-uuid",
    "nickname": "davi",
    "profilePhoto": null,
    "birthDate": "2013-02-27T00:00:00.000Z",
    "gender": "MALE",
    "height": 1.71,
    "weight": 71,
    "dominantFoot": "RIGHT",
    "primaryPosition": "DEFENDER",
    "secondaryPosition": null,
    "currentClub": "Santa Cruz",
    "biography": "Atleta de futebol. Posições: Zagueiro, lateral, volante",
    "hasManager": false,
    "managerName": null,
    "managerCompany": null,
    "managerContact": null,
    "hasNutritionist": false,
    "hasPsychologist": false,
    "hasPersonalTrainer": false,
    "instagramUrl": null,
    "twitterUrl": null,
    "youtubeUrl": null,
    "createdAt": "2026-05-03T13:00:00.000Z",
    "updatedAt": "2026-05-03T14:25:00.000Z"
  },
  "address": {
    "id": "address-uuid",
    "athleteId": "athlete-uuid",
    "zipCode": "60744030",
    "street": "Rua dos Mandacarus",
    "number": "101",
    "complement": null,
    "district": "Passaré",
    "city": "Fortaleza",
    "state": "CE",
    "country": "Brasil",
    "createdAt": "...",
    "updatedAt": "..."
  },
  "user": {
    "id": "user-uuid",
    "name": "Davi Oliveira",
    "email": "levidaviolivira@gmail.com",
    "cpf": null,
    "role": "ATHLETE",
    "isActive": true
  }
}
```

`address` é `null` se o atleta não tem endereço cadastrado **e** o request não enviou um.

---

## 🚨 Erros

| Status | `message` | Quando |
|--------|-----------|--------|
| `400` | varia (Zod) | Body inválido (formato, enum, comprimento) |
| `404` | `Atleta não encontrado.` | `id` não corresponde a nenhum `AthleteProfile` |
| `409` | `Nickname já está em uso por outro atleta.` | `nickname` enviado pertence a outro atleta |
| `409` | `Email já está em uso por outro usuário.` | `email` enviado pertence a outro user |
| `409` | `CPF já está em uso por outro usuário.` | `cpf` enviado pertence a outro user |

Erros 409 não fazem nenhuma alteração — pode reapresentar o formulário com a mensagem.

---

## 💡 Exemplos de consumo

### Atualizar só os campos da seção "Perfil do atleta"

```ts
await api.patch(`/admin/athletes/${athleteId}`, {
  nickname: 'davi',
  height: 1.71,
  weight: 71,
  primaryPosition: 'DEFENDER',
  dominantFoot: 'RIGHT',
  currentClub: 'Santa Cruz',
})
```

### Atualizar conta + endereço numa única chamada

```ts
await api.patch(`/admin/athletes/${athleteId}`, {
  name: 'Davi Oliveira',
  email: 'levidaviolivira@gmail.com',
  isActive: true,
  address: {
    zipCode: '60744030',
    street: 'Rua dos Mandacarus',
    number: '101',
    district: 'Passaré',
    city: 'Fortaleza',
    state: 'CE',
  },
})
```

### Limpar campos opcionais

```ts
await api.patch(`/admin/athletes/${athleteId}`, {
  cpf: null,                 // remove o CPF
  secondaryPosition: null,   // remove posição secundária
  currentClub: null,         // remove clube atual
})
```

### Criar endereço de quem ainda não tem

Mesmo payload do exemplo "conta + endereço". O backend detecta que o atleta não tem `Address` e cria — não há endpoint separado de "criar endereço".

---

## 🔁 Sugestão de fluxo no frontend

1. Carregar a tela de detalhe com `GET /admin/athletes/:id` (já implementado).
2. Mapear o response para o formulário (perfil + endereço + dados de conta).
3. No submit, montar **diff** entre estado original e atual e enviar **só os campos alterados** via `PATCH`.
4. No `200`, mesclar o response no estado local (o backend devolve o objeto completo já consolidado).
5. Tratar `409` exibindo a mensagem ao lado do campo correspondente (`nickname`, `email`, `cpf`).

---

## 🔐 `POST /api/admin/athletes/:id/reset-password` — alterar senha do atleta

Endpoint dedicado para o admin definir uma **nova senha** para o atleta. Não confunde com o fluxo de "esqueci minha senha" (esse é via e-mail).

**Auth:** `Bearer <accessToken>` com `role = 'ADMIN'`.

### Path param

| Param | Tipo |
|---|---|
| `id` | UUID — `AthleteProfile.id` |

### Body

| Campo | Tipo | Observações |
|---|---|---|
| `password` | string (8–128) | Senha em texto puro. Backend hashea com bcrypt antes de salvar. |

### Resposta

| Status | Body | Quando |
|---|---|---|
| `204 No Content` | — | Senha redefinida com sucesso |
| `400` | Zod | `password` inválida (curta demais, etc.) |
| `404` | `Atleta não encontrado.` | `id` não corresponde |

### Efeitos colaterais

- **Invalida todos os refresh tokens** do atleta — qualquer dispositivo conectado é forçado a refazer login na próxima request 401.
- O access token atual continua válido até expirar (default 15 min). Se quiser invalidação imediata absoluta, peça pra subir endpoint de logout-all (hoje só existe o do próprio user).
- Não envia e-mail nem notificação — comunique a nova senha pro atleta fora da plataforma.

### Exemplo

```ts
await api.post(`/admin/athletes/${athleteId}/reset-password`, {
  password: 'NovaSenhaForte123',
})
// 204 → mostre toast "Senha alterada. Avise o atleta."
```

> **UX recomendada:** modal com campo de senha + confirmação no front (não passar para o backend — só o `password` final). Após sucesso, mostrar a senha em claro pro admin **uma vez** com botão "Copiar" e disclaimer "Você não verá mais essa senha".

---

## ✅ Cobertura de testes

`src/http/use-cases/admin/update-athlete.spec.ts` cobre:

- 404 quando o `:id` não existe
- Atualização combinada de campos de `User` + `AthleteProfile`
- Conflitos: nickname / email / cpf de outro usuário
- Criação de endereço quando o atleta não tem
- Atualização parcial de endereço existente (mantém campos não enviados)
