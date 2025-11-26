# 👥 Usuários Existentes com Vídeos/Jogos Criados

## ❓ Pergunta

**"E os usuários que já têm hoje em dia, acontece o quê?"**

## ✅ Resposta

### O que acontece com usuários existentes:

#### 1. **Vídeos/Jogos Criados ANTES do Sistema de Billing**

**Não são contados!** ✅

- Vídeos/jogos criados antes da implementação do sistema de billing **não contam** para os limites
- Os contadores começam do **zero** no mês atual
- Exemplo:
  ```
  Usuário criou 50 vídeos em Outubro
  Sistema de billing foi implementado em Novembro
  → Contador em Novembro: 0 vídeos ✅
  → Pode criar até o limite do plano (5 standalone no FREE)
  ```

#### 2. **Vídeos/Jogos Criados NESTE MÊS (Após Implementação)**

**São contados automaticamente!** ✅

- Quando o usuário cria um vídeo/jogo, o contador incrementa
- O middleware verifica o limite antes de permitir
- Se já criou 5 vídeos standalone este mês → não pode criar mais (no plano FREE)

#### 3. **Vídeos/Jogos Criados NESTE MÊS (Antes da Implementação)**

**Opção A: Deixar como está (Recomendado)**

- Contadores começam do zero quando o sistema é ativado
- Vídeos/jogos já criados este mês **não contam**
- Usuário pode criar mais até o limite

**Opção B: Inicializar contadores (Opcional)**

- Executar script de migração para contar vídeos/jogos já criados este mês
- Contadores refletem o que já foi criado
- Usuário pode estar no limite se já criou muito

---

## 🔄 Exemplo Prático

### Cenário: Usuário com 20 vídeos criados em Novembro

**Antes do sistema de billing:**
- Usuário criou 20 vídeos standalone em Novembro
- Nenhum contador existe

**Depois do sistema de billing (sem migração):**
```
1. Usuário tenta criar vídeo
2. Sistema verifica contador: 0 vídeos ✅
3. Permite criar (dentro do limite de 5)
4. Contador: 0 → 1
5. Pode criar mais 4 vídeos este mês
```

**Depois do sistema de billing (com migração):**
```
1. Script conta: 20 vídeos já criados
2. Inicializa contador: standaloneVideosUsed = 20
3. Usuário tenta criar vídeo
4. Sistema verifica: 20 >= 5 (limite) ❌
5. Retorna 402: "Monthly standalone video limit reached"
6. Usuário não pode criar mais (já passou do limite)
```

---

## 📋 Recomendação

### Para Usuários Existentes:

**Opção 1: Deixar como está (Mais Justo)**

- Contadores começam do zero quando sistema é ativado
- Usuários não são penalizados por vídeos criados antes
- Mais justo para quem já criou muito conteúdo

**Opção 2: Inicializar contadores (Mais Preciso)**

- Executar script de migração
- Contadores refletem uso real do mês
- Mas pode bloquear usuários que já criaram muito

---

## 🛠️ Script de Migração

Se quiser inicializar contadores para usuários existentes:

```bash
tsx scripts/migrate-existing-users.ts
```

**O que o script faz:**
1. Conta jogos criados este mês
2. Conta vídeos em jogos criados este mês
3. Conta vídeos standalone criados este mês
4. Inicializa contadores no banco

**Importante:** O script só conta conteúdo criado **neste mês**. Conteúdo de meses anteriores não é contado.

---

## ✅ Resumo

| Situação | O que acontece |
|----------|----------------|
| **Vídeos/jogos criados antes do sistema** | Não contam ✅ |
| **Vídeos/jogos criados este mês (sem migração)** | Não contam (contador começa do zero) ✅ |
| **Vídeos/jogos criados este mês (com migração)** | Contam (contador inicializado) ⚠️ |
| **Novos vídeos/jogos após implementação** | Contam normalmente ✅ |
| **Deletar vídeo/jogo** | Decrementa contador ✅ |

---

## 🎯 Recomendação Final

**Para produção, recomendo:**

1. **NÃO executar migração** (deixar contadores começarem do zero)
   - Mais justo para usuários existentes
   - Evita bloquear quem já criou muito conteúdo
   - Limites começam a valer a partir de agora

2. **OU executar migração** (se quiser ser rigoroso)
   - Contadores refletem uso real
   - Mas pode bloquear usuários que já passaram do limite

**A escolha é sua!** O sistema funciona de ambas as formas. ✅

