
# Arquitetura do Backend — InfraMap

## 1. Visão geral

O InfraMap utiliza uma API REST desenvolvida com Node.js,
Express e TypeScript, integrada ao Supabase.

O estilo arquitetural adotado é:

- Monólito modular
- Arquitetura em camadas (N-Layer)
- Domain-Driven Design (DDD) seletivo
- MVC na camada de apresentação

O DDD é aplicado aos módulos que possuem regras de
negócio relevantes, evitando abstrações desnecessárias.

## 2. Camadas da aplicação

### Domain

Responsável por representar conceitos, regras e
contratos do domínio.

Contém entidades, objetos de valor e interfaces
de repositórios.

Não deve depender de Express, Supabase, Zod ou
outras tecnologias externas.

### Application

Contém os casos de uso responsáveis por coordenar
as operações da aplicação.

Depende dos contratos do domínio, não das
implementações concretas do banco.

Não deve utilizar Request, Response ou outros
objetos HTTP do Express.

### Infrastructure

Contém implementações concretas de persistência e
integração com serviços externos.

Os repositórios Supabase implementam os contratos
definidos pelo domínio.

### Presentation

Responsável pela comunicação HTTP.

Contém controllers, rotas e schemas de validação.

Os controllers chamam casos de uso e devolvem
respostas, sem consultar diretamente o Supabase.

### Shared

Contém recursos compartilhados:

- Middlewares de autenticação e autorização
- Tratamento centralizado de erros
- Logger
- Tipos e utilitários comuns

## 3. Estrutura do módulo Identity

src/modules/identity/
  application/
    use-cases/
      get-current-user.use-case.ts

  domain/
    entities/
      user-profile.entity.ts
    repositories/
      identity.repository.ts

  infrastructure/
    repositories/
      supabase-identity.repository.ts

  presentation/
    identity.controller.ts
    identity.routes.ts
    identity.schema.ts

## 4. Fluxo de identificação do usuário

1. O cliente envia uma requisição autenticada.
2. Os middlewares validam o token e o papel do usuário.
3. A composição em src/routes/index.routes.ts fornece
   o contexto e o repositório de identidade.
4. O controller chama GetCurrentUserUseCase.
5. O caso de uso consulta o contrato ProfileReader.
6. O repositório concreto consulta user_roles no Supabase.
7. O caso de uso valida a identidade e as permissões.
8. O controller retorna a resposta HTTP.

Erros são encaminhados ao middleware centralizado.

## 5. Regras de dependência

- Domain não importa Application, Infrastructure
  ou Presentation.
- Application depende de Domain.
- Infrastructure implementa contratos de Domain.
- Presentation utiliza casos de uso de Application.
- Controllers não executam consultas SQL ou Supabase.
- Casos de uso não utilizam req ou res.
- Credenciais e tokens não devem aparecer em logs.
- Acesso a dados deve respeitar RLS e as permissões
  definidas no Supabase.

## 6. Outros módulos

Módulos complexos, como occurrences, ai-analysis
e moderation, utilizarão a estrutura completa
quando forem implementados.

Módulos simples, como health e categories, não
precisam receber camadas adicionais sem necessidade.

Não devem ser criadas pastas ou abstrações sem uso real.

## 7. Integrações com o banco de dados

Os clientes Supabase são definidos em
src/infrastructure/supabase/.

O acesso deve utilizar o contexto de autenticação
apropriado.

Conforme as Implementation Notes (anexo 11),
consultas a occurrences devem utilizar a view
pública ou as RPCs autorizadas, em vez de SELECT
direto com o cliente do usuário.

Migrations já aplicadas não devem ser reescritas.

## 8. Testes e qualidade

A arquitetura deve preservar os comportamentos
existentes e permitir testes isolados.

Os casos de uso são testados com repositórios mockados.

As rotas são verificadas por testes de integração.

Antes de concluir uma implementação, executar:

npm run build
npm run lint
npm test

## 9. Limites da refatoração ARC-01

A reorganização do Identity preserva os endpoints
e contratos existentes.

As rotas provisórias de validação de usuário ainda
não representam uma implementação completa de
gerenciamento de perfis.

A rota provisória POST /identity/users foi ajustada para não devolver dados sensíveis na resposta. Foi acrescentado um teste automatizado de regressão para verificar esse comportamento. A implementação definitiva do cadastro de usuários permanece fora do escopo da ARC-01.

A implementação definitiva de gerenciamento e
desativação de perfis pertence às tarefas ID-01
e ID-02, respectivamente.
