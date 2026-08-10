# SaniMap

Plataforma colaborativa para identificação, registro e acompanhamento de problemas relacionados ao saneamento urbano.

## Descrição do Projeto

O **SaniMap** é uma aplicação mobile desenvolvida com o objetivo de proporcionar a comunidade local um disque denuncia de problemas de saneamento urbano.

A plataforma permite que cidadãos registrem ocorrências encontradas em suas comunidades, fornecendo informações como categoria do problema, descrição, localização e imagens. As ocorrências são posteriormente analisadas e gerenciadas por administradores da plataforma, que podem validar os registros, definir prioridades, atualizar seus status e acompanhar sua resolução.

O projeto busca transformar informações dispersas sobre problemas urbanos em registros organizados e georreferenciados, facilitando a visualização das ocorrências e o acompanhamento de sua evolução direcionando-os aos órgãos competentes.

## Objetivo da Solução

O objetivo do SaniMap é desenvolver uma ferramenta digital que facilite a **participação comunitária na identificação e no acompanhamento de problemas de saneamento urbano**.

A solução pretende:

* Permitir o registro de problemas de saneamento pela população;
* Registrar a localização das ocorrências;
* Permitir o envio de imagens e descrições;
* Organizar as ocorrências por categorias;
* Permitir que administradores validem e gerenciem os registros;
* Acompanhar o andamento das ocorrências por meio de diferentes status;
* Facilitar a visualização dos problemas em um mapa;
* Organizar um histórico das alterações realizadas em cada ocorrência;
* Fornecer uma visão centralizada dos problemas identificados pela comunidade.

### Fluxo principal

```text
Cidadão
   ↓
Registro da ocorrência
   ↓
Análise pelo administrador
   ↓
Validação
   ↓
Classificação e priorização
   ↓
Acompanhamento
   ↓
Atualização do status
   ↓
Resolução da ocorrência
```

## Escopo do MVP

Nesta primeira versão, o sistema terá dois tipos principais de usuários:

### Cidadão

* Cadastro e autenticação;
* Registro de ocorrências;
* Inclusão de descrição;
* Seleção da categoria do problema;
* Registro da localização;
* Envio de imagens;
* Consulta das ocorrências registradas;
* Acompanhamento do status das ocorrências.

### Administrador

* Visualização das ocorrências;
* Visualização das ocorrências em mapa;
* Filtragem por categoria e status;
* Análise dos registros;
* Validação ou rejeição de ocorrências;
* Definição de prioridade;
* Atualização do status;
* Registro de observações;
* Acompanhamento do histórico das ocorrências.

## Categorias de Ocorrências

O MVP poderá contemplar categorias como:

* Esgoto;
* Abastecimento de água;
* Alagamento;
* Drenagem;
* Resíduos e lixo;
* Outros problemas relacionados ao saneamento.

## Status das Ocorrências

As ocorrências poderão seguir um fluxo de acompanhamento:

```text
Recebido
   ↓
Em análise
   ↓
Confirmado
   ↓
Em atendimento
   ↓
Resolvido
```

Ocorrências também poderão ser rejeitadas durante o processo de análise quando não apresentarem informações suficientes ou não forem consideradas válidas.

## Equipe

* **Deivid Souza** 
* **Jõao Vitor** 
* **Andre Almeida** 
* **Ismael Rodrigues** 
