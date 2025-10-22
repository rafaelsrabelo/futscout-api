# FutScout - Requisitos Funcionais, Regras de Negócio e Requisitos Não-Funcionais

## 📱 RFs (Requisitos Funcionais) - Funcionalidades da Aplicação

### Autenticação (A1)
- [ ] Deve ser possível se registrar com email e senha
- [ ] Deve ser possível se autenticar com email e senha
- [ ] Deve ser possível fazer logout
- [ ] Deve ser possível recuperar o token JWT após login
- [ ] Deve ser possível validar se o usuário está autenticado
- [ ] Deve ser possível recuperar/resetar senha via email

### Perfil do Atleta (A2)
- [ ] Deve ser possível criar perfil após primeira autenticação
- [ ] Deve ser possível editar informações do perfil (categoria, clube, localização, altura, peso, perna dominante, bio)
- [ ] Deve ser possível visualizar perfil de um atleta logado
- [ ] Deve ser possível visualizar perfil públicamente de qualquer atleta
- [ ] Deve ser possível adicionar/atualizar empresário
- [ ] Deve ser possível adicionar/editar foto de perfil
- [ ] Deve ser gerado um slug único para cada atleta (ex: bernardo-rabelo)
- [ ] Deve ser possível acessar o perfil via URL amigável (www.futscout.com/in/bernardo-rabelo)
- [ ] Deve ser possível visualizar perfil por slug sem necessidade de autenticação

### Mídia (A3)
- [ ] Deve ser possível upload de fotos para o perfil
- [ ] Deve ser possível upload de vídeos (via YouTube/Vimeo ou arquivo local)
- [ ] Deve ser possível listar todas as mídias de um atleta
- [ ] Deve ser possível deletar uma mídia
- [ ] Deve ser possível organizar vídeos por posição ou campeonato

### Estatísticas e Jogos (A4)
- [ ] Deve ser possível registrar um novo jogo
- [ ] Deve ser possível adicionar estatísticas do jogo (gols, assistências, minutos jogados, nota/rating)
- [ ] Deve ser possível editar estatísticas de um jogo
- [ ] Deve ser possível deletar um jogo
- [ ] Deve ser possível listar todos os jogos de um atleta
- [ ] Deve ser possível visualizar resumo de estatísticas (total de gols, assistências, média de notas)

### Conquistas e Prêmios (A7)
- [ ] Deve ser possível adicionar um título/campeonato conquistado
- [ ] Deve ser possível adicionar um prêmio individual
- [ ] Deve ser possível editar conquistas
- [ ] Deve ser possível deletar conquistas
- [ ] Deve ser possível listar todas as conquistas de um atleta

### Feed (A5)
- [ ] Deve ser possível visualizar feed com publicações de outros atletas
- [ ] Deve ser possível filtrar feed por categoria (idade)
- [ ] Deve ser possível filtrar feed por localização
- [ ] Deve ser possível curtir publicação de outro atleta
- [ ] Deve ser possível comentar em publicação de outro atleta
- [ ] Deve ser possível visualizar estatísticas de engajamento (curtidas, comentários, visualizações)
- [ ] Deve ser possível favoritar um atleta (adicionar à lista de favoritos)
- [ ] Feed pode mostrar atletas mais favoritados como destaque

### Notificações (A6)
- [ ] Deve ser possível receber notificação quando alguém visualizar seu perfil
- [ ] Deve ser possível receber notificação quando alguém curtir seu vídeo/jogo
- [ ] Deve ser possível receber notificação quando alguém comentar seu conteúdo
- [ ] Deve ser possível listar todas as notificações do atleta
- [ ] Deve ser possível marcar notificação como lida
- [ ] Deve ser possível gerenciar preferências de notificações

### Compartilhamento e Link Público (A8)
- [ ] Deve ser possível gerar link público do perfil via slug
- [ ] Deve ser possível visualizar perfil por slug sem autenticação (www.futscout.com/in/:slug)
- [ ] Deve ser possível compartilhar link do perfil via WhatsApp, e-mail, etc.
- [ ] Slug deve ser único na plataforma
- [ ] Slug deve ser gerado automaticamente a partir do nome do atleta
- [ ] Slug deve aceitar caracteres alfanuméricos e hífens
- [ ] Slug deve ser case-insensitive

### Busca e Exploração (Observador)
- [ ] Deve ser possível buscar atletas por nome
- [ ] Deve ser possível filtrar atletas por categoria (Sub-9, 11, 13, 15, 17, 20)
- [ ] Deve ser possível filtrar atletas por posição
- [ ] Deve ser possível filtrar atletas por localização (cidade/estado)
- [ ] Deve ser possível filtrar atletas por perna dominante
- [ ] Deve ser possível filtrar atletas por desempenho (ex: +10 gols)

### Favoritos (Atleta e Observador)
- [ ] Deve ser possível adicionar atleta aos favoritos
- [ ] Deve ser possível remover atleta dos favoritos
- [ ] Deve ser possível visualizar lista de atletas favoritos
- [ ] Deve ser possível visualizar quantos usuários favoritaram um atleta
- [ ] Deve ser possível visualizar ranking de atletas mais favoritados

---

## 🎯 RNs (Regras de Negócio)

### Autenticação
- [ ] O login com email e senha deve retornar um token JWT válido por 30 dias
- [ ] O usuário não autenticado não pode acessar endpoints privados
- [ ] Ao fazer login pela primeira vez, o usuário é redirecionado para criar perfil
- [ ] Um usuário só pode ter uma conta ativa por email
- [ ] Email deve ser único na plataforma
- [ ] Senha deve ter no mínimo 8 caracteres (contendo letras, números e caracteres especiais)
- [ ] Senha deve ser hasheada com bcrypt antes de ser armazenada
- [ ] Token JWT deve ter refresh token para renovação
- [ ] Tentativas de login falhadas (mais de 5) devem bloquear a conta temporariamente por 15 minutos

### Perfil do Atleta
- [ ] Um atleta deve completar o perfil (categoria, clube, localização) antes de acessar o feed
- [ ] Todos os campos obrigatórios do perfil devem ser preenchidos: nome, categoria, localização, altura, peso, perna dominante
- [ ] A foto de perfil é obrigatória
- [ ] A categoria é uma enumeração fixa (Sub-9, 11, 13, 15, 17, 20)
- [ ] A perna dominante é obrigatória (direita ou esquerda)
- [ ] A altura e peso devem ser valores válidos (altura > 1.0 e < 2.5, peso > 30 e < 150)
- [ ] Um slug único deve ser gerado automaticamente para cada atleta (baseado no nome)
- [ ] Se o slug já existir, deve-se adicionar um sufixo numérico (ex: bernardo-rabelo-2)
- [ ] Slug deve aceitar apenas caracteres alfanuméricos, hífens e underscores
- [ ] Slug deve ser convertido para lowercase
- [ ] O slug não pode ser alterado após a criação do perfil (imutável)
- [ ] Slug deve ter comprimento mínimo de 3 caracteres e máximo de 50

### Mídia
- [ ] Máximo de 50 fotos por atleta
- [ ] Máximo de 20 vídeos por atleta
- [ ] Vídeos devem ter descrição obrigatória
- [ ] Apenas o atleta proprietário pode deletar suas mídias
- [ ] Tamanho máximo de foto: 5MB
- [ ] Tamanho máximo de vídeo: 100MB (se upload direto)

### Estatísticas e Jogos
- [ ] Apenas o atleta pode registrar seus próprios jogos
- [ ] Um jogo não pode ter data no futuro
- [ ] Minutos jogados não pode ser maior que 120 (caso fosse prorrogação, máximo 150)
- [ ] Rating (nota) deve estar entre 0 e 10
- [ ] Gols, assistências devem ser números inteiros não-negativos
- [ ] Não é permitido deletar um jogo com menos de 24 horas de criação (opcional: ajustar prazo)

### Conquistas
- [ ] Apenas o atleta pode adicionar suas conquistas
- [ ] Cada conquista deve ter título obrigatório
- [ ] Descrição é opcional

### Feed
- [ ] O feed mostra vídeos e jogos de outros atletas (não do próprio usuário)
- [ ] O feed é ordenado por data de criação (mais recente primeiro)
- [ ] Máximo de 20 itens por página (paginação)
- [ ] Um atleta não pode curtir duas vezes a mesma publicação
- [ ] Um atleta não pode favoritar a si mesmo
- [ ] Apenas atletas podem comentar e curtir (não observadores)
- [ ] Atletas podem favoritar tanto outros atletas quanto observadores

### Notificações
- [ ] Uma notificação é gerada automaticamente quando alguém visualiza o perfil
- [ ] Uma notificação é gerada automaticamente quando alguém curte ou comenta
- [ ] Notificações mantêm histórico de 30 dias
- [ ] Notificações podem ser desativadas por tipo via preferências

### Compartilhamento
- [ ] Link público segue o padrão: /in/:slug (ex: /in/bernardo-rabelo)
- [ ] Link público não requer autenticação
- [ ] Link público exibe apenas informações não-sensíveis (sem email privado, por exemplo)
- [ ] Slug deve ser único na plataforma e imutável

### Favoritos
- [ ] Um atleta não pode favoritar a si mesmo
- [ ] Cada favorito é um registro único (atleta_id + favorited_athlete_id)
- [ ] Um atleta pode ter no máximo 500 favoritos
- [ ] Contador de favoritos é atualizado em tempo real
- [ ] Ranking de atletas mais favoritados é recalculado diariamente ou em cache

---

## ⚙️ RNFs (Requisitos Não-Funcionais)

### Stack Técnico
- [ ] Backend: Node.js com TypeScript e Express.js
- [ ] Framework Web: React Native (Expo) para mobile
- [ ] Frontend Observador: Next.js com Tailwind CSS (responsivo)
- [ ] Banco de Dados: MongoDB
- [ ] Autenticação: Google OAuth 2.0 e JWT
- [ ] Armazenamento: AWS S3 para mídia

### Performance
- [ ] Tempo de resposta máximo de 500ms para requisições GET
- [ ] Tempo de resposta máximo de 1000ms para upload de mídia
- [ ] API deve suportar pelo menos 1000 requisições simultâneas
- [ ] Feed deve carregar em menos de 2 segundos
- [ ] Imagens devem ser otimizadas (máximo 200KB após compressão)

### Segurança
- [ ] Todas as senhas devem ser hasheadas com bcrypt
- [ ] JWT deve ser validado em todas as rotas autenticadas
- [ ] CORS deve estar configurado apenas para domínios permitidos
- [ ] Validação de input em todos os endpoints
- [ ] Rate limiting: máximo 100 requisições por IP a cada 15 minutos
- [ ] Rate limiting: máximo 5 tentativas de login por IP a cada 15 minutos
- [ ] Dados sensíveis não devem ser expostos em logs
- [ ] Email de confirmação deve ser enviado após registro
- [ ] Implementar HTTPS em produção (SSL/TLS)

### Escalabilidade
- [ ] API deve ser stateless (sem sessões)
- [ ] Endpoints devem suportar paginação
- [ ] Índices de banco de dados otimizados para consultas de busca
- [ ] Cache de perfis com Redis (opcional)
- [ ] Possibilidade de adicionar load balancer

### Confiabilidade
- [ ] Uptime mínimo de 99.5%
- [ ] Backup automático do banco de dados a cada 24h
- [ ] Logs estruturados (Winston ou similar)
- [ ] Monitoramento com Sentry ou New Relic
- [ ] Tratamento de erros consistente com status HTTP apropriados

### Documentação
- [ ] API documentada com Swagger/OpenAPI
- [ ] README com instruções de setup
- [ ] Exemplos de requests/responses para cada endpoint
- [ ] Variáveis de ambiente documentadas

### Compatibilidade
- [ ] App mobile compatível com iOS 12+
- [ ] App mobile compatível com Android 8+
- [ ] Web responsivo para Desktop, Tablet e Mobile
- [ ] Suporte a navegadores modernos (Chrome, Firefox, Safari, Edge)

### Acessibilidade
- [ ] Cores com contraste mínimo WCAG AA
- [ ] Textos alt em todas as imagens
- [ ] Navegação por teclado funcional
- [ ] Suporte a leitores de tela

### Testes
- [ ] Cobertura de testes unitários mínima de 80%
- [ ] Testes de integração para endpoints críticos
- [ ] Testes E2E para fluxos principais (login, criar perfil, feed)

### Deployment
- [ ] CI/CD com GitHub Actions ou similar
- [ ] Deploy automático em staging a cada push
- [ ] Deploy em produção com approval manual
- [ ] Versionamento semântico (MAJOR.MINOR.PATCH)