# Meu perfil — painel administrativo

## Objetivo

Tela de identificação da conta conectada ao painel web, mantendo os recursos atuais do InfraMap.

Branch: feature/admin-perfil-conta-sessao, criada diretamente do commit c4aa8dc712b64fa7fc9f99b427b77fd71050fdd0 da main.

## Escopo

- Menu lateral e cabeçalho oferecem acesso ao perfil; o cabeçalho mostra nome, e-mail e nível.
- Rota /admin/profile protegida por ProtectedRoute, disponível para Master e Operacional.
- Dados do usuário: nome, e-mail de acesso, telefone, data de cadastro, nível e sessão autenticada.
- Edição de nome e telefone usando GET e PATCH /api/v1/identity/me, já existentes.
- Senha alterada pela SDK Supabase Auth com verificação explícita da senha atual, sem passar pela API Express.
- Estados de carregamento, erros, mensagens de sucesso e interface responsiva.

## Segurança

O e-mail e o nível administrativo não são editáveis nesta tela. Não são utilizadas chaves privilegiadas no navegador.
Credenciais não são salvas na cache de consultas. A alteração da senha pode exigir OTP adicional quando a política de reautenticação do Supabase estiver habilitada; nesse caso é necessário usar a recuperação existente ou implementar esse passo futuramente.

## Verificação local

Na pasta frontend execute:

    npm ci
    npm run typecheck
    npm test -- src/features/profile src/routes/app-routes.test.tsx
    npm run build

Valide com contas Master e Operacional, teste senha atual incorreta e atualização com senha válida.
Verifique que um cidadão sem papel administrativo não abre /admin/profile.

Nenhuma migration ou alteração no backend é necessária para essa versão da tela.

## Refinamento visual do perfil (23/11/2026)

- Faixa superior compacta sem espaço azul vazio; avatar, conta e nível alinhados.
- Título e navegação em uma faixa, cartões de dados e segurança com espaçamentos uniformes.
- Dados cadastrais em duas colunas em telas maiores; edição responsiva.
- Ícones Mostrar/Ocultar em cada um dos três campos de senha, independentes e acessíveis.
- Conferir o resultado em janelas estreitas e largas, com o formulário aberto e fechado.
- Testes adicionais em frontend/src/features/profile/pages/admin-profile-page.test.tsx.
