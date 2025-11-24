# Endpoint de Deleção de Conta

## Informações para Apple App Store Review

Este documento descreve como funciona o endpoint de deleção de conta do usuário no aplicativo FutScout, conforme requisito da Apple (Guideline 5.1.1(v)).

## Endpoint

```
DELETE /auth/account
```

## Autenticação

O endpoint requer autenticação JWT. O usuário deve estar logado no aplicativo.

**Header obrigatório:**
```
Authorization: Bearer {jwt_token}
```

## Funcionamento

1. **O usuário pode deletar sua própria conta diretamente pelo aplicativo**
2. **Todos os dados associados à conta são permanentemente deletados**, incluindo:
   - Perfil de atleta ou observador
   - Dados pessoais (CPF, endereço, foto de perfil, etc.)
   - Times criados
   - Histórico de times
   - Partidas e jogadas
   - Competições
   - Favoritos
   - Pesquisas salvas
   - Tokens de sessão
   - Códigos de verificação

3. **O processo é irreversível** - não há recuperação após a deleção

## Exemplo de Requisição

```bash
curl -X DELETE https://api.futscout.com/auth/account \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Respostas

### Sucesso (200)
```json
{
  "message": "Account deleted successfully"
}
```

### Erro - Token inválido (401)
```json
{
  "message": "Unauthorized"
}
```

### Erro - Usuário não encontrado (404)
```json
{
  "message": "User not found"
}
```

### Erro interno (500)
```json
{
  "message": "Internal server error"
}
```

## Implementação no App

No aplicativo móvel, este endpoint deve ser chamado quando o usuário:
1. Acessa as configurações da conta
2. Seleciona a opção "Deletar minha conta"
3. Confirma a deleção (recomendamos uma confirmação em duas etapas)

## Conformidade com Apple Guidelines

✅ **Guideline 5.1.1(v) - Deleção de Conta**
- O app permite criar conta
- O app permite deletar a conta pelo próprio app
- A deleção é completa e permanente
- O processo é acessível e fácil de usar

---

**Data de implementação:** 24/11/2025
**Versão da API:** 1.0.0

