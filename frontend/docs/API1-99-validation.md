# API1-99 — Gestão de administradores

Tela `/admin/admins`, dentro de ProtectedRoute, MasterRoute e AdminLayout. Implementação MVVM isolada em `features/admins`: página, formulário, `useAdminManagementViewModel` e `AdministratorsService`.

## Contratos e comportamento

- Identidade obtida de GET `/admin/me`; exige ADMIN ativo e `admin_level: MASTER`. Ausência de nível, erro de identidade, CITIZEN, OPERATIONAL e inativo bloqueiam a tela. Nenhuma autorização é inferida do JWT ou da listagem.
- GET `/admin/admins`: mostra nome, nível e situação. O contrato não retorna e-mail nem data de cadastro; essas colunas do mockup não são inventadas.
- POST `/admin/admins`: nome 1–150, e-mail válido até 254, senha 8–72 e nível MASTER/OPERATIONAL. Criação direta, sem promessa de convite ou e-mail automático.
- PATCH `/admin/admins/:id`: envia apenas a situação ou nível confirmado. Alterar a própria conta apresenta aviso de possível perda de acesso.
- A lista bloqueia desativação/rebaixamento do último MASTER ativo conhecido. A API continua sendo a autoridade em concorrência; 409 apresenta orientação e atualiza a lista. Não altera RLS ou migrations.
- Identidade atualizada a cada 30 segundos enquanto a tela está aberta e revalidada antes de escrever. 401/403 durante ações bloqueiam a tela e removem o cache da lista. Alterações bem-sucedidas invalidam lista e identidade, incluindo alterações da própria conta.
- Mutações não têm retry automático; uma trava evita submissões concorrentes. A senha não entra no cache de mutations, listas ou mensagens e é apagada do formulário após tentativa de criação. Não há persistência de formulário em storage.

## Verificação

Testes em `features/admins` cobrem identidades permitidas/negadas, validação de limites, criação e limpeza da senha, duplicidade sem retry, confirmação de promoção e ativação/desativação, último MASTER e conflito concorrente, revogação antes da escrita e 403 durante uma ação. Os testes existentes de guardas verificam proteção de rotas.

Executar `npm test`, `npm run build` e `npm run lint`. Testes usam respostas controladas da API. A revisão visual e a integração com contas reais de homologação não foram executadas nesta entrega. Não foram criadas contas reais nem alteradas permissões em ambiente remoto.
