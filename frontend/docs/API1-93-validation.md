# API1-93 — Login administrativo e recuperação de senha

## Branch e dependências

Nova branch: feature/web-ui-01-login-admin.
Base: feature/web-arc-01-admin-mvvm (API1-91), que ainda não entrou na main.
Nenhuma alteração na main, no backend, no banco ou nos segredos do Supabase.
A API1-100 ainda precisa fornecer admin_level pelo endpoint /api/v1/admin/me.

## Login administrativo

A View realiza autenticação por Supabase Auth, enquanto o ViewModel valida a identidade pela API Express.
Somente ADMIN ativo entra no painel; contas de cidadão e ADMIN inativo ficam bloqueadas.
A senha nunca é pré-preenchida pelo código e não é registrada em logs ou em parâmetros de URL.
Um envio pendente não pode ser submetido novamente.
O returnTo aceita somente caminhos locais no prefixo /admin.
A validação MASTER permanece bloqueada enquanto não houver nível oficial no backend.
A sessão é encerrada no logout, e o cache compartilhado é limpo.
A renovação de tokens usa o SDK do Supabase e o cliente HTTP existente, sem repetir mutações automaticamente.

## Recuperação web com confirmação explícita

Um scanner de e-mail pode abrir um link de verificação e consumir seu token de uso único.
O fluxo novo evita a verificação automática só pelo carregamento da página.

1. O frontend solicita resetPasswordForEmail com redirectTo igual a http://localhost:5173/confirm-recovery.
2. O template de e-mail web envia o token_hash em fragmento de URL (após #), nunca em query para o backend.
3. A página de confirmação apenas lê o fragmento, remove o token da barra de endereço e aguarda clique humano.
4. Somente clicar em Continuar recuperação executa verifyOtp com type recovery.
5. Após sucesso, a SPA navega para /reset-password e permite updateUser, seguido de encerramento da sessão.
6. Links inválidos ou expirados mostram instruções para solicitar outro e-mail, sem formulário.
7. A solicitação de recuperação exibe mensagem genérica para contas existentes e inexistentes.

O fragmento de recuperação é uma credencial temporária. Não registrar nem compartilhar links completos.

## Configuração manual do Supabase — não aplicada nesta branch

O projeto atual atende ao mobile e foi identificado como PRODUCTION pelo Dashboard. Não publicar alterações no template global sem revisão.

- Em Authentication > URL Configuration adicionar http://localhost:5173/confirm-recovery aos Redirect URLs.
- Manter todos os deep links mobile e a Site URL já existente.
- Revisar o template de Authentication > Emails > Reset password usando o arquivo docs/supabase-password-recovery-template.html.
- O template usa a condição Go Template para selecionar a rota web apenas quando RedirectTo corresponde ao localhost:5173/confirm-recovery. Para os outros destinos, mantém ConfirmationURL.
- Testar o e-mail mobile após aplicar o template, pois ele é global.
- Para staging ou produção real, alterar a URL condicional para o domínio aprovado.
- E-mails gerados antes dessa mudança não têm o novo formato; é necessário solicitar um novo.
- A alteração do template e sua homologação são pré-requisitos para validar o novo fluxo end-to-end.

## Checklist da API1-93

- [ ] ADMIN ativo consegue login e dashboard.
- [ ] CITIZEN e ADMIN inativo não entram no painel.
- [ ] Credenciais inválidas exibem mensagem genérica.
- [ ] 401 e renovação; 403 sem refresh; sessão expirada e logout.
- [ ] Navegação protegida e returnTo externo bloqueado.
- [ ] Recuperação não enumera contas; rate limit respeitado.
- [ ] Link aberto sem clique não consome token.
- [ ] Confirmar chama verifyOtp uma vez e libera formulário.
- [ ] Link expirado não libera formulário.
- [ ] Redefinição atualiza senha, limpa campos e encerra sessão.
- [ ] Fluxo mobile continua funcionando após qualquer modificação do template.
- [ ] Verificações npm run typecheck, npm run lint, npm test e npm run build aprovadas.

Testes automatizados cobrem ViewModels/Views, parse dos links, autorização e comportamento do HTTP client.

