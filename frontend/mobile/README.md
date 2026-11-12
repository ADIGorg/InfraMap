# InfraMap Mobile

Aplicativo cidadão em React Native, Expo SDK 58 e TypeScript, organizado por funcionalidade em MVVM.

## Telas

Boas-vindas, login, cadastro, recuperação de senha, mapa público, prévia no mapa, lista própria, perfil, notificações, detalhes público e próprio, fotos, análise de IA, revisão, localização e confirmação de envio.

## Configuração dos serviços

Preencha também `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env`. Use a chave publicável do projeto. A sessão é guardada no SecureStore e renovada quando necessário. Recuperação e confirmação de e-mail usam os destinos configurados no Supabase Auth. O destino do link de recuperação precisa oferecer a definição da nova senha.

## Contratos de integração

- O serviço de registro reproduz a convenção de paths de `CreateAiAnalysisUseCase` do backend, mantendo a ordem das fotos. O upload retorna apenas o ID da análise e a contagem, enquanto a finalização exige `storagePath`. Uma mudança na convenção do servidor exige atualizar esse mapeamento.
- A finalização recebe latitude e longitude. O backend atual fixa a origem como GPS, inclusive quando o ponto é ajustado no mapa. A distinção GPS/manual depende de evolução do contrato HTTP.
- Após falha ou timeout na finalização, o app orienta consultar as próprias ocorrências antes de iniciar novo envio, pois a gravação pode já ter ocorrido.
- Perfil permite editar nome e telefone. Os status, as categorias e a visibilidade pública seguem as respostas da API.
- Os documentos de termos e privacidade ainda precisam ser fornecidos para integrar links e aceite.

## Executar no Expo Go

1. Use uma versão do Expo Go compatível com o SDK 58.
2. Com o backend em execução, copie `.env.example` para `.env`. Em `EXPO_PUBLIC_API_BASE_URL`, informe a URL da API com o sufixo `/api/v1`. Para usar o backend local no celular, substitua o IP do exemplo pelo IPv4 do computador acessível na mesma rede Wi-Fi.
3. A partir da raiz do repositório, execute:

   ```powershell
   cd frontend/mobile
   npm install
   npm start
   ```

4. Abra o QR code no Expo Go. Depois de alterar a configuração, recarregue o app.

## Estrutura

- `index.ts` registra a raiz do aplicativo.
- `src/app/App.tsx` compõe a navegação, com estado em `useAppViewModel.ts`.
- `src/features/categories/CategoriesScreen.tsx` renderiza a tela e delega as ações.
- `src/features/categories/useCategoriesViewModel.ts` coordena o carregamento e a recuperação de erros.
- `src/features/categories/categoriesApi.ts` implementa a consulta `GET /api/v1/categories` e o tipo retornado pela API.

Execute `npm run typecheck` para verificar os tipos.

Os módulos `auth`, `map`, `occurrences`, `occurrence-report`, `profile` e `notifications` mantêm suas Views, ViewModels, tipos e serviços HTTP próximos. `shared` contém a sessão, o transporte HTTP e os componentes usados em várias telas.

Execute `npm test` para verificar renovação concorrente da sessão, recuperação de falhas HTTP e o payload de finalização.
