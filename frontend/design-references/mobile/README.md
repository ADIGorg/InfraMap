# Referências visuais — App mobile InfraMap

Estas 16 telas são **referências visuais de UI/UX** de um protótipo originalmente identificado como **SaniMap**. O projeto atual é **InfraMap**. Preserve a linguagem visual e a organização das telas, adaptando o nome e o texto para o InfraMap.

## Regra de precedência

- O protótipo é referência **para layout, hierarquia visual, componentes, estilos e navegação desejada**.
- Para **dados, categorias, estado de ocorrência, permissões, fotos e autenticação**, prevalecem AGENTS.md, especificações oficiais aprovadas do InfraMap e o contrato real da API (`docs/openapi.yaml`, quando disponível).
- Não inventar endpoints, campos ou operações da API; documentar divergências e confirmar o escopo antes de implementar comportamento incompatível.
- Não usar o JPG/PNG da tela como imagem de fundo: construir componentes React Native reais, responsivos e acessíveis.

## Índice de telas

| Arquivo | Tela | Observação |
| --- | --- | --- |
| 01-boas-vindas.png | Apresentação do app | Primeira tela; marca do protótipo é SaniMap |
| 02-login.png | Login | Campos de e-mail e senha |
| 03-cadastro.png | Cadastro | Conferir contrato de cadastro |
| 04-recuperar-senha.png | Recuperação de senha | Funcionalidade opcional no MVP segundo docs |
| 05-mapa-publico.png | Mapa público | Estados exibidos definidos pelo backend |
| 06-mapa-preview-ocorrencia.png | Prévia no mapa | Bottom sheet com acesso a detalhes |
| 07-minhas-ocorrencias.png | Lista do cidadão | Apenas ocorrências próprias |
| 08-perfil.png | Perfil | O protótipo cita edição de e-mail; API só prevê editar nome e telefone |
| 09-notificacoes.png | Notificações | Persistentes via API; push fora do MVP aprovado |
| 10-detalhes-ocorrencia-publica.png | Detalhe público | Dados e localização aproximada conforme API |
| 11-detalhes-propria-ocorrencia.png | Detalhe próprio e histórico | Histórico de estados |
| 12-nova-ocorrencia-fotos.png | Nova ocorrência: fotos | 1 a 3 imagens JPEG/PNG, até 5MB cada |
| 13-nova-ocorrencia-analise-ia.png | Nova ocorrência: IA | Análise assíncrona; tratar processamento/falha |
| 14-nova-ocorrencia-revisao.png | Nova ocorrência: revisão | Categoria e descrição revisáveis |
| 15-nova-ocorrencia-localizacao.png | Nova ocorrência: localização | GPS ou manual, conforme API |
| 16-nova-ocorrencia-sucesso.png | Confirmação de envio | Somente após sucesso real da API |

## Divergências conhecidas

1. **Marca**: imagens usam SaniMap; projeto chama-se InfraMap. Tratar nome como conteúdo a atualizar, preservando a identidade visual desejada, salvo orientação posterior.
2. **Categorias**: imagens incluem categorias antigas de saneamento (ex.: vazamento de água). A documentação InfraMap atual prevê CAT01–CAT07 de infraestrutura urbana.
3. **Mapa**: protótipo pode exibir estados incompatíveis com a API. Fonte oficial publica somente CONFIRMED e IN_SERVICE.
4. **Perfil**: botão "Editar nome e e-mail" no protótipo não equivale ao PATCH oficial, que permite nome e telefone, não e-mail.
5. **Recuperação de senha**: protótipo exibe tela; implementação depende de contrato e escopo efetivos.
6. **Notificações**: tela deve consumir notificações persistentes; não assumir integração FCM, que foi descrita em texto complementar mas ficou fora do MVP oficial.

## Como orientar o desenvolvimento

Comece pela tela de boas-vindas e autenticação, estabelecendo tokens de design e componentes compartilhados. Em seguida implemente navegação e estados vazios, e só então o fluxo de integração com a API. Em cada tarefa, compare a tela implementada com a imagem correspondente; identifique desvios de espaçamento, tipografia, tamanhos e cores, mas evite coordenadas rígidas para um único aparelho.
