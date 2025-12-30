# Prompt: Gerar Relatório de Tarefas por UC e Perfil

## Objetivo
Utilizar a API de integração com o Azure Boards para gerar um relatório em Markdown que lista todas as tarefas realizadas, agrupadas pelo seu respectivo Caso de Uso (UC) e Perfil de Utilizador.

## Contexto
A API, disponível em http://localhost:3000, expõe os dados do Azure Boards. A estrutura de trabalho no Azure Boards segue a hierarquia: Perfil (Epic) -> Caso de Uso (User Story) -> Tarefa (Task).

Os perfis e UCs estão documentados em:
- `@tasks/funcionalidades.md` (Perfil: Candidato)
- `@tasks/funcionalidades_gestor.md` (Perfil: Gestor de Plataforma)

## Processo

1.  **Obter os Dados:**
    - Realize uma requisição GET para o endpoint `/tasks` da API.
    ```bash
    curl http://localhost:3000/tasks
    ```

2.  **Processar a Resposta:**
    - A resposta será um JSON contendo uma estrutura de árvore (hierarquia) de itens de trabalho.
    - Percorra a árvore para identificar os itens de nível superior (Epics), que representam os Perfis.
    - Para cada Perfil (Epic), itere sobre seus filhos (User Stories), que representam os Casos de Uso (UCs).
    - Para cada UC (User Story), itere sobre seus filhos (Tasks), que são as tarefas de desenvolvimento.

3.  **Gerar o Relatório Markdown:**
    - Crie um arquivo .md com o seguinte formato:

    ```markdown
    # Relatório de Tarefas Realizadas

    ## Perfil: [Nome do Perfil - ex: Candidato]

    ### UCXX: [Nome do Caso de Uso]
    - [ID da Tarefa] - [Título da Tarefa] (Estado: [Estado da Tarefa])
    - [ID da Tarefa] - [Título da Tarefa] (Estado: [Estado da Tarefa])

    ### UCXY: [Nome do Outro Caso de Uso]
    - [ID da Tarefa] - [Título da Tarefa] (Estado: [Estado da Tarefa])

    ---

    ## Perfil: [Nome do Outro Perfil - ex: Gestor de Plataforma]

    ### UCXX: [Nome do Caso de Uso]
    - [ID da Tarefa] - [Título da Tarefa] (Estado: [Estado da Tarefa])
    ```

4.  **Detalhes Adicionais (Opcional):**
    - Para obter a descrição completa de uma tarefa específica, utilize o endpoint `/task/:id/description`.
    ```bash
    curl http://localhost:3000/task/123/description
    ```

## Exemplo de Saída Esperada

```markdown
# Relatório de Tarefas Realizadas

## Perfil: Candidato

### UC07: Preencher Dados da Aplicação
- 99 - [BACKEND]: Criar Endpoint para Modelo de Distribuição (Estado: Done)
- 100 - [BACKEND]: Criar Endpoint para Tipos de Autenticação (Estado: Done)
- 101 - [BACKEND]: Criar Endpoint para Sistema Operativo (Estado: Done)
- 102 - [FRONTEND]: Integrar Endpoints de Enums no Formulário de Produto (Estado: Active)

---

## Perfil: Gestor de Plataforma

### UC02: Configurar Serviços e Tipos de Serviços Digitais
- 150 - [INFRA]: Criar Estrutura de CI/CD e ArgoCD para o Serviço de Permissions (Estado: Done)
```
