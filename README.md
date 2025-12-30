# MCP - Conector Azure Boards e Confluence

Este projeto é um servidor Node.js compatível com o Model-View-Controller (MCP). Ele expõe as APIs do Azure Boards e do Confluence como um conjunto de ferramentas que podem ser usadas por assistentes de IA e outras aplicações compatíveis com o MCP.

## Configuração

1.  **Instalar Dependências:**
    O projeto requer Node.js. Se as dependências não estiverem instaladas, elas serão baixadas automaticamente ao executar o script de inicialização. Para uma instalação manual, execute:
    ```bash
    npm install
    ```

2.  **Configurar Variáveis de Ambiente:**
    - Crie um arquivo `.env` na raiz do projeto (`mcp/.env`).
    - Adicione as seguintes variáveis com os seus dados do Azure DevOps e Confluence:

      ```
      # --- Azure DevOps ---
      # URL da sua organização no Azure DevOps
      AZURE_DEVOPS_ORG_URL=https://dev.azure.com/sua_organizacao
      # Nome do seu projeto
      AZURE_DEVOPS_PROJECT=seu_projeto
      # Personal Access Token (PAT) com permissão para ler Work Items
      AZURE_DEVOPS_PAT=seu_pat

      # --- Confluence ---
      # URL da sua instância do Confluence (ex: https://sua-empresa.atlassian.net)
      CONFLUENCE_URL=https://sua-empresa.atlassian.net
      # Email do usuário para autenticação no Confluence
      CONFLUENCE_USER=seu-email@exemplo.com
      # Token de API do Atlassian
      CONFLUENCE_API_TOKEN=seu_token_de_api
      ```

## Execução

A maneira mais simples de executar o projeto no Windows é usando o script `start.bat`.

### Windows

1.  Execute o arquivo `start.bat` com um duplo clique.
2.  O script irá:
    - Verificar se as dependências (`node_modules`) existem e, se não, irá instalá-las (`npm install`).
    - Iniciar o servidor da aplicação MCP em uma janela de terminal.
    - Aguardar até que o servidor esteja pronto.
    - Iniciar o proxy do MCP Superassistant em uma segunda janela, conectando-se ao servidor local.

### Outros Sistemas Operacionais (ou Execução Manual)

1.  **Inicie o servidor MCP:**
    Abra um terminal e execute:
    ```bash
    npm run start:app
    ```
    O servidor estará em execução em `http://localhost:3005/mcp`.

2.  **Inicie o Proxy:**
    Abra um **segundo** terminal e execute o comando abaixo para iniciar o proxy que conecta o servidor local ao MCP Superassistant.
    ```bash
    npx @srbhptl39/mcp-superassistant-proxy@latest --config config.json --host localhost --port 3005 --ssePath /mcp --outputTransport streamableHttp
    ```

Após a execução, você pode acessar o [MCP Superassistant](https://mcpsuperassistant.ai/) para interagir com as ferramentas.

## Ferramentas Disponíveis (MCP)

Este servidor expõe as seguintes ferramentas através do protocolo MCP:

### Azure Boards
- **getTasks**: Retorna uma lista hierárquica de todas as tarefas ativas, agrupadas por Épico e User Story.
- **getTaskDescription**: Retorna os detalhes e a descrição de uma tarefa específica.
- **getChildTasks**: Retorna uma lista de tarefas filhas para uma determinada tarefa pai.
- **countAllTasks**: Retorna a contagem total de todas as tarefas já criadas no projeto.
- **getTasksByType**: Retorna uma lista de tarefas de um tipo específico ('Epic', 'User Story' ou 'Task').

### Confluence
- **get_page**: Recupera uma página específica do Confluence pelo seu ID.
- **search_confluence**: Pesquisa conteúdo no Confluence usando CQL (Confluence Query Language).
- **list_spaces**: Lista todos os espaços disponíveis no Confluence.
- **create_page**: Cria uma nova página no Confluence.
- **update_page**: Atualiza uma página existente no Confluence.
