# Importação de Atletas via CSV — Admin

Endpoint para importar atletas em massa a partir de um arquivo `.csv`. Equivale ao script `scripts/importar-atletas.ts`, mas acessível via HTTP para uso no painel admin.

---

## Endpoint

```
POST /api/admin/athletes/import
```

**Autenticação:** `Authorization: Bearer <token>` (usuário com role `ADMIN`)

**Content-Type:** `multipart/form-data`

**Campo:** `file` — arquivo `.csv`

---

## Resposta

```json
{
  "created": 42,
  "updated": 3,
  "total": 45,
  "errors": [
    {
      "row": 5,
      "nome": "João Silva",
      "cpf": "00000000001",
      "error": "CPF inválido: 1"
    }
  ]
}
```

| Campo | Descrição |
|-------|-----------|
| `created` | Atletas novos criados |
| `updated` | Atletas existentes atualizados (nickname + clube atual) |
| `total` | Total de linhas processadas |
| `errors` | Linhas que falharam — `row` é o número da linha no CSV (começa em 2) |

**Status codes:**
- `200` — processado (mesmo que haja erros parciais no array `errors`)
- `400` — arquivo não enviado, CSV vazio ou malformado
- `401` — não autenticado
- `403` — usuário não é admin

---

## Formato do CSV

O CSV deve ter **cabeçalho na primeira linha** (ignorado) e as colunas na ordem exata abaixo:

| Coluna | Exemplo | Observações |
|--------|---------|-------------|
| `nome` | `João da Silva` | Nome completo |
| `cpf` | `123.456.789-09` | Com ou sem máscara |
| `nascimento` | `2005-03-15` ou `2005-03-15 00:00:00` | ISO 8601 |
| `categoria` | `Sub-17` | Livre (não salvo ainda) |
| `equipe` | `Fortaleza EC` | Nome do clube atual |
| `altura` | `1.78` ou `1,78` | Em metros |
| `peso` | `72.5` ou `72,5` | Em kg |
| `email` | qualquer coisa | Ignorado — e-mail gerado automaticamente como `{cpf}@futscore.club` |
| `genero` | `Masculino` / `Feminino` | Prefixo `masc`/`fem` ou `M`/`F` |
| `peDominante` | `Direito` / `Esquerdo` | Prefixo `esq` = esquerdo |
| `cep` | `60135-222` | Com ou sem máscara — consultado no ViaCEP |
| `numero` | `100` | Número do endereço |
| `acompanhamento` | `Sim` / `Não` | `sim`, `s`, `yes`, `1` = true |
| `posicao` | `Goleiro` | Ver mapeamento abaixo |

### Mapeamento de posição

| Texto no CSV | Enum salvo |
|---|---|
| `goleiro`, `goalkeeper` | `GOALKEEPER` |
| `zagueiro`, `lateral`, `defensor`, `defender` | `DEFENDER` |
| `atacante`, `forward`, `centroavante`, `ponta` | `FORWARD` |
| qualquer outro | `MIDFIELDER` |

---

## O que é criado por atleta

Para cada linha válida com CPF **ainda não cadastrado**, a API cria em uma única transação:

1. **`User`** — role `ATHLETE`, e-mail `{cpf}@futscore.club`, senha = CPF (hash bcrypt)
2. **`AthleteProfile`** — vinculado ao user, com todos os dados físicos e posição
3. **`Address`** — endereço resolvido via ViaCEP usando o CEP da planilha
4. **`Team`** + **`AthleteTeam`** — time com o nome do campo `equipe` (apenas se preenchido)

Se o CPF **já existe**, apenas `nickname` e `currentClub` são atualizados — nenhum outro dado é sobrescrito.

---

## Exemplo de implementação no frontend

```tsx
import { useState } from 'react'

type ImportResult = {
  created: number
  updated: number
  total: number
  errors: { row: number; nome: string; cpf: string; error: string }[]
}

export function ImportAthletes() {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement).files?.[0]
    if (!file) return

    const form = new FormData()
    form.append('file', file)

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/athletes/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        // NÃO definir Content-Type manualmente — o browser inclui o boundary automaticamente
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Erro desconhecido')
      }

      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" name="file" accept=".csv" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Importando...' : 'Importar CSV'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div>
          <p>
            ✓ Criados: {result.created} | Atualizados: {result.updated} | Total: {result.total}
          </p>
          {result.errors.length > 0 && (
            <>
              <p>Linhas com erro ({result.errors.length}):</p>
              <ul>
                {result.errors.map((e) => (
                  <li key={e.row}>
                    Linha {e.row} — {e.nome} ({e.cpf}): {e.error}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </form>
  )
}
```

---

## Comportamento em caso de erro parcial

O endpoint **não é atômico globalmente** — cada atleta é importado individualmente. Se a linha 10 falhar, as linhas 1–9 já foram salvas e as linhas 11+ continuam sendo processadas. Os erros são acumulados no array `errors` da resposta com status `200`.

Isso significa que o frontend deve sempre checar `errors.length` mesmo quando o status for `200`.
