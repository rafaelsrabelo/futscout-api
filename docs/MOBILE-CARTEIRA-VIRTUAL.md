# Carteira Virtual do Atleta — Mobile

Documento para o time mobile implementar a tela de **Carteira Virtual** do atleta no app FutScore.

> **Resumo executivo:** uma tela acessível pelo perfil do atleta que renderiza, em formato de cartão, os dados de identificação (foto, nome, CPF, nascimento, posição, clube). MVP é 100% offline-friendly: lê dados do `GET /api/athletes/me/profile` que já existe e cacheia. **Sem QR code nesta fase** — a leitura por mesários/dirigentes vem na fase 2 quando existir o app de mesário.

---

## Contexto e fases

A carteira virtual nasce como substituto digital do crachá/RG-de-atleta usado para confirmar identidade antes de partidas. O roadmap é:

| Fase | Quem usa | O que tem |
|---|---|---|
| **1 (atual / MVP)** | O próprio atleta | Tela "Minha Carteira" no app. Sem QR. |
| 2 (futuro) | Mesários, donos de liga, admin | Mesmo cartão + **QR code**. Mesário escaneia → vai direto pra súmula daquela partida. |
| 3 (futuro) | Atletas + apps externos | Apple Wallet (`.pkpass`) e Google Wallet (Generic Pass). |

Esta doc cobre **apenas a fase 1**.

---

## Endpoint

### `GET /api/athletes/me/profile` (autenticado)

Já existe e é o que vamos consumir. **Mudança recente:** o response agora inclui o campo `name` (vem do `User`, não do `AthleteProfile`).

#### Request

```http
GET /api/athletes/me/profile
Authorization: Bearer <accessToken>
```

#### Response 200 (campos relevantes pra carteira)

```json
{
  "athleteProfile": {
    "id": "uuid",
    "name": "João Vitor Andrade Barbosa",
    "cpf": "63545311376",
    "nickname": "joo6354",
    "profilePhoto": "https://r2.../foto.jpg",
    "birthDate": "2000-05-12T00:00:00.000Z",
    "gender": "MALE",
    "primaryPosition": "FORWARD",
    "secondaryPosition": null,
    "dominantFoot": "RIGHT",
    "currentClub": "Bragantino",
    "height": 178,
    "weight": 75,
    "createdAt": "2026-04-28T...",
    "updatedAt": "..."
  }
}
```

> **Atenção:** o response tem outros campos (achievements, social URLs, manager, address, etc.) que **não** entram no cartão — ignore. A doc lista só o que a carteira precisa.

#### Casos sem dado

| Campo | Quando vem null | Como renderizar |
|---|---|---|
| `name` | Atleta importado que ainda não completou cadastro | Mostrar "Atleta não identificado" — não deveria ser comum |
| `cpf` | Cadastro novo sem CPF (raro) | Mostrar "—" no cartão |
| `profilePhoto` | Atleta nunca subiu foto | Avatar com **iniciais** (ex: "JV") em fundo da brand color |
| `birthDate` | Importação incompleta | Esconder o campo "Idade" |
| `currentClub` | Sem time atual | Esconder linha "Clube" |

---

## UX da tela

### Entrada

Aba "Perfil" → botão `Minha Carteira` (com ícone de carteira). Pode também ir num drawer ou em "Atalhos".

### Comportamento ao clicar

1. App **garante brilho máximo** da tela (lib `expo-brightness` ou `react-native-screen-brightness`).
2. Mostra loader curtinho.
3. Renderiza o cartão em **tela cheia** (sem header de navegação, só um botão "Fechar" ou swipe down).
4. Ao sair, **restaura o brilho** ao valor anterior.

### Layout do cartão (sugerido)

```
┌──────────────────────────────────┐
│  [LOGO FUTSCORE]      ✓ Verificado │  ← header
│                                    │
│  ┌──────┐                          │
│  │      │  JOÃO VITOR ANDRADE      │  ← nome em destaque (16-18pt bold)
│  │ FOTO │  BARBOSA                  │
│  │      │  @joo6354                 │  ← nickname (cinza, 12pt)
│  └──────┘                          │
│                                    │
│  CPF              635.453.113-76   │  ← formatar com máscara
│  Nascimento       12/05/2000 (24)  │  ← data + idade calculada
│  Posição          Atacante         │  ← traduzir enum
│  Clube atual      Bragantino       │
│                                    │
│  ───────────────────────────────   │
│  Atleta FutScore · ID 6094bc6f     │  ← rodapé pequeno (8 chars do id)
└──────────────────────────────────┘
```

#### Detalhes visuais

- Cartão ocupa ~85% da largura, centralizado, com **bordas arredondadas grandes** (24-32px) e **sombra leve**.
- Fundo do cartão pode ser gradiente sutil (verde/azul FutScore) ou branco com borda colorida.
- Foto: circular ou quadrada com cantos arredondados (~80-100px).
- Tipografia: nome em uppercase, weight 700; campos em weight 400 com label cinza.
- Cores: usar a paleta atual do app (não introduzir nova).

### Tradução de enums

| Enum backend | Texto no cartão |
|---|---|
| `GOALKEEPER` | Goleiro |
| `DEFENDER` | Zagueiro |
| `MIDFIELDER` | Meio-campo |
| `FORWARD` | Atacante |
| `RIGHT` | Destro |
| `LEFT` | Canhoto |
| `MALE` | Masculino |
| `FEMALE` | Feminino |
| `OTHER` | Outro |

### Formatação de campos

- **CPF:** `63545311376` → `635.453.113-76` (máscara com `^(\d{3})(\d{3})(\d{3})(\d{2})$`).
- **birthDate:** ISO string → `dd/MM/yyyy`. Idade = `now - birthDate` em anos completos. Mostra junto: `12/05/2000 (24 anos)`.
- **Iniciais (avatar fallback):** primeiras letras do primeiro e último nome → `João Vitor Andrade Barbosa` → `JB`. Se só tem 1 palavra, pega 2 primeiras letras → `Jo`.

---

## Cache offline

Importante pro caso de "atleta vai jogar e o estádio não tem rede".

1. Quando app abre a tela `Minha Carteira`, **busca via API e salva** o response em `AsyncStorage` (ou MMKV) com chave `card:<userId>`.
2. Se a request falhar (sem internet), **lê do cache** e mostra o cartão com badge "📡 Modo offline" no header.
3. TTL do cache: indefinido. Sempre tenta atualizar quando online; se falhar, usa o cache existente.

---

## Funcionalidades NÃO incluídas (fase 1)

- ❌ QR code na tela.
- ❌ Botão "Compartilhar carteira" / link público.
- ❌ Adicionar à Apple Wallet / Google Wallet.
- ❌ Selo "Verificado" com timestamp dinâmico (por enquanto é só estático).
- ❌ Validade da carteira / renovação.

Isso tudo entra em fases futuras quando o app de mesário existir.

---

## Checklist de implementação

- [ ] Tela nova "Minha Carteira" acessível pelo perfil.
- [ ] Consumir `GET /api/athletes/me/profile`.
- [ ] Renderizar com layout proposto (foto, nome, nickname, CPF, nascimento, posição, clube).
- [ ] Avatar com iniciais quando `profilePhoto` é null.
- [ ] Brilho automático máximo ao abrir, restaura ao fechar.
- [ ] Cache local pro modo offline.
- [ ] Formatação de CPF, data e idade.
- [ ] Tradução de enums.
- [ ] Tela responsiva (testar em iPhone SE até iPad).
- [ ] Botão de fechar / swipe-down.

---

## Pontos abertos / a alinhar

- **Brand do cartão**: cor primária / gradiente — alinhar com design.
- **Logo FutScore**: PNG ou SVG; cor branca ou colorida sobre o fundo.
- **Localização do botão "Minha Carteira"**: aba Perfil, drawer, ou shortcut na home? Sugiro Perfil → seção "Documentos".
- **ID do atleta no rodapé**: vale mostrar os 8 primeiros chars do UUID? Ajuda a identificar visualmente em suporte.
