# MCP - Conector Azure Boards e Confluence

Servidor MCP (Model Context Protocol) que expõe as APIs do Azure Boards e do Confluence como ferramentas para assistentes de IA compatíveis com MCP (Claude Code, Perplexity, etc.).

## Arquitetura

```
Claude Code / Perplexity
        │
        │ HTTPS
        ▼
Cloudflare Edge (WAF + Tunnel)
        │
        │ HTTP
        ▼
nginx (SSL termination) ── container mcp-nginx
        │
        │ HTTP proxy
        ▼
MCP Server (Express + MCP SDK) ── container mcp-server :3005
        │
        ├── Azure DevOps API (PAT)
        └── Confluence API (API Token)
```

## Pré-requisitos

- Docker e Docker Compose
- Conta Cloudflare com domínio configurado
- PAT do Azure DevOps com permissão de leitura em Work Items
- Token de API do Atlassian (Confluence)

## Configuração

### 1. Variáveis de ambiente

Cria o ficheiro `.env` a partir do template:

```bash
cp .env.template .env
```

Preenche as variáveis:

```env
# Azure DevOps
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/sua_organizacao
AZURE_DEVOPS_PROJECT=nome_do_projeto
AZURE_DEVOPS_PAT=seu_pat
AZURE_DEVOPS_TEAM=nome_da_equipa

# Confluence
CONFLUENCE_URL=https://sua-empresa.atlassian.net
CONFLUENCE_USER=email@exemplo.com
CONFLUENCE_API_TOKEN=seu_token

# Cloudflare Tunnel
CLOUDFLARE_TUNNEL_TOKEN=token_do_tunnel_cloudflare

# Token de segurança para a WAF rule do Cloudflare
CLAUDFLARE_SECURE_TOKEN_RULE=Bearer <token_gerado>
```

Para gerar um token seguro:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Cloudflare Tunnel

1. Acede a [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → Networks → Tunnels → **Create a Tunnel**
2. Selecciona **Cloudflared** e copia o token para `CLOUDFLARE_TUNNEL_TOKEN`
3. Em **Public Hostnames**, adiciona:

   | Campo | Valor |
   |---|---|
   | Subdomain | `mcp` (ou outro) |
   | Domain | o teu domínio |
   | Type | `HTTP` |
   | URL | `mcp-server:3005` |

### 3. Protecção via WAF (Cloudflare)

No Cloudflare Dashboard → o teu domínio → **Security → WAF → Custom Rules → Create rule**:

- **Expression**: 
  ```
  not any(http.request.headers["authorization"][*] contains "Bearer <o-teu-token>")
  ```
- **Action**: Block

Isto bloqueia todos os requests sem o token correcto na edge, antes de chegarem ao servidor.

## Deploy

```bash
docker compose up -d
```

Para verificar os logs:
```bash
docker compose logs -f
```

Para rebuildar após alterações ao código:
```bash
docker compose up -d --build mcp-server
```

## Uso no Perplexity

1. Acede ao Perplexity → Settings → **MCP Servers** → Add
2. Preenche:

   | Campo | Valor |
   |---|---|
   | URL | `https://mcp.<teu-dominio>/mcp` |
   | Transport | Streamable HTTP |
   | Authentication | API Key |
   | API Key | `Bearer <o-teu-token>` |

3. Guarda e activa o servidor.

## Uso no Claude Code

Adiciona ao `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "azure-boards-connector": {
      "type": "http",
      "url": "http://localhost:3005/mcp"
    }
  }
}
```

> O acesso local não requer autenticação. A WAF rule só actua nos requests que passam pelo Cloudflare.

## Ferramentas Disponíveis

### Azure Boards

| Ferramenta | Descrição |
|---|---|
| `getTasks` | Lista hierárquica de tarefas activas (Épico → User Story → Task) |
| `getTaskDescription` | Detalhes, descrição e comentários de uma tarefa específica |
| `getChildTasks` | Tarefas filhas de uma tarefa pai |
| `countAllTasks` | Total de tarefas criadas no projecto |
| `getTasksByType` | Tarefas filtradas por tipo: `Epic`, `User Story` ou `Task` |
| `getSprintUserStoriesWithChildren` | User Stories de um sprint com as suas tarefas filhas |
| `listTeams` | Lista todas as equipas do projecto Azure DevOps |
| `listTeamIterations` | Iterações (sprints) da equipa, com filtro por `current`/`past`/`future` |
| `getIterationTasks` | Work items de um sprint por ID, nome, substring ou número |
| `listSprints` | Lista todos os sprints do projecto |

### Confluence

| Ferramenta | Descrição |
|---|---|
| `get_page` | Recupera uma página pelo ID |
| `search_confluence` | Pesquisa conteúdo via CQL |
| `list_spaces` | Lista todos os espaços disponíveis |
| `create_page` | Cria uma nova página (conteúdo em Confluence Storage Format) |
| `update_page` | Actualiza uma página existente |
| `get_page_comments` | Comentários de uma página, com filtro por localização e profundidade |
