import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as azureBoards from './azure-boards';
import { confluenceClient } from './confluence';

export const mcpServer = new McpServer({
  name: 'azure-boards-connector',
  version: '1.0.0',
});

// #region Confluence Tools
mcpServer.registerTool(
  'get_page',
  {
    title: 'Get Confluence Page',
    description: 'Retrieve a specific Confluence page by its ID.',
    inputSchema: {
      pageId: z.string().describe('The ID of the Confluence page.'),
    },
    outputSchema: {
      page: z.any(),
    },
  },
  async ({ pageId }) => {
    const page = await confluenceClient.getPageContent(pageId);
    return {
      content: [{ type: 'text', text: JSON.stringify(page, null, 2) }],
      structuredContent: { page },
    };
  }
);

mcpServer.registerTool(
  'search_confluence',
  {
    title: 'Search Confluence',
    description: 'Search Confluence content using CQL (Confluence Query Language).',
    inputSchema: {
      cql: z.string().describe('CQL search query (e.g., \'type=page AND space=DEMO\').'),
    },
    outputSchema: {
      results: z.any(),
    },
  },
  async ({ cql }) => {
    const results = await confluenceClient.search(cql);
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      structuredContent: { results },
    };
  }
);

mcpServer.registerTool(
  'list_spaces',
  {
    title: 'List Confluence Spaces',
    description: 'List all available Confluence spaces.',
    inputSchema: {},
    outputSchema: {
      spaces: z.any(),
    },
  },
  async () => {
    const spaces = await confluenceClient.listSpaces();
    return {
      content: [{ type: 'text', text: JSON.stringify(spaces, null, 2) }],
      structuredContent: { spaces },
    };
  }
);

mcpServer.registerTool(
  'create_page',
  {
    title: 'Create Confluence Page',
    description: 'Creates a new Confluence page. Content must be in Confluence Storage Format (XML-based).',
    inputSchema: {
      spaceKey: z.string().describe('The key of the space for the new page.'),
      title: z.string().describe('The title for the new page.'),
      content: z.string().describe('Page content in Confluence Storage Format (XML-based).'),
      parentId: z.string().optional().describe('ID of the parent page (optional).'),
    },
    outputSchema: {
      page: z.any(),
    },
  },
  async ({ spaceKey, title, content, parentId }) => {
    const page = await confluenceClient.createPage(spaceKey, title, content, parentId);
    return {
      content: [{ type: 'text', text: `Page created: ${JSON.stringify(page, null, 2)}` }],
      structuredContent: { page },
    };
  }
);

mcpServer.registerTool(
  'update_page',
  {
    title: 'Update Confluence Page',
    description: 'Updates an existing Confluence page. Content must be in Confluence Storage Format (XML-based).',
    inputSchema: {
      pageId: z.string().describe('The ID of the page to update.'),
      title: z.string().describe('The new title for the page.'),
      content: z.string().describe('New page content in Confluence Storage Format (XML-based).'),
    },
    outputSchema: {
      page: z.any(),
    },
  },
  async ({ pageId, title, content }) => {
    const page = await confluenceClient.updatePage(pageId, title, content);
    return {
      content: [{ type: 'text', text: `Page updated: ${JSON.stringify(page, null, 2)}` }],
      structuredContent: { page },
    };
  }
);
// #endregion

mcpServer.registerTool(
  'getTasks',
  {
    title: 'Get Tasks',
    description: 'Returns a hierarchical list of all active tasks, grouped by Epic and User Story.',
    inputSchema: {}, // Empty object for no input
    outputSchema: {
      tasks: z.array(z.any()), // Output is an array of tasks
    },
  },
  async () => {
    const tasks = await azureBoards.getTasks();
    return {
      content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      structuredContent: { tasks },
    };
  }
);

mcpServer.registerTool(
  'getTaskDescription',
  {
    title: 'Get Task Description',
    description: 'Returns the details and description of a specific task.',
    inputSchema: {
      taskId: z.number().describe('The ID of the task.'),
    },
    outputSchema: {
      id: z.number(),
      title: z.string(),
      state: z.string(),
      type: z.string(),
      description: z.string(),
    },
  },
  async ({ taskId }) => {
    const description = await azureBoards.getTaskDescription(taskId);
    return {
      content: [{ type: 'text', text: JSON.stringify(description, null, 2) }],
      structuredContent: description,
    };
  }
);

mcpServer.registerTool(
  'getChildTasks',
  {
    title: 'Get Child Tasks',
    description: 'Returns a list of child tasks for a given parent task.',
      inputSchema: {
      parentId: z.number().describe('The ID of the parent task.'),
    },
    outputSchema: {
      childTasks: z.array(z.object({
        id: z.number(),
        title: z.string(),
        state: z.string(),
        type: z.string(),
      }).passthrough()),
    },
  },
  async ({ parentId }) => {
    const childTasks = await azureBoards.getChildTasks(parentId);
    return {
      content: [{ type: 'text', text: JSON.stringify(childTasks, null, 2) }],
      structuredContent: { childTasks },
    };
  }
);

mcpServer.registerTool(
  'countAllTasks',
  {
    title: 'Count All Tasks',
    description: 'Returns the total count of all tasks ever created in the project.',
    inputSchema: {}, // Empty object for no input
    outputSchema: {
      count: z.number(),
    },
  },
  async () => {
    const count = await azureBoards.countAllTasks();
    return {
      content: [{ type: 'text', text: JSON.stringify(count, null, 2) }],
    structuredContent: count,
  }}
);

mcpServer.registerTool(
  'getTasksByType',
  {
    title: 'Get Tasks By Type',
    description: "Returns a list of tasks of a specific type. The possible types are 'Epic', 'User Story' and 'Task'.",
    inputSchema: {
      taskType: z.enum(['Epic', 'User Story', 'Task']).describe("The type of the task. Can be 'Epic', 'User Story' or 'Task'."),
    },
    outputSchema: {
      tasks: z.array(z.object({
        id: z.number(),
        title: z.string(),
        state: z.string(),
        type: z.string(),
      }).passthrough()),
    },
  },
  async ({ taskType }) => {
    const tasks = await azureBoards.getTasksByType(taskType as 'Epic' | 'User Story' | 'Task');
    return {
      content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      structuredContent: { tasks },
    };
  }
);
