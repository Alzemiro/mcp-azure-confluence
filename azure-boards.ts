import * as ado from 'azure-devops-node-api';
import { WorkItemExpand, TreeStructureGroup } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { TeamContext } from 'azure-devops-node-api/interfaces/CoreInterfaces';

const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
const token = process.env.AZURE_DEVOPS_PAT;
const project = process.env.AZURE_DEVOPS_PROJECT;
const team = process.env.AZURE_DEVOPS_TEAM || project;

if (!orgUrl || !token || !project) {
  throw new Error('Missing required environment variables: AZURE_DEVOPS_ORG_URL, AZURE_DEVOPS_PAT, AZURE_DEVOPS_PROJECT');
}

// Removed teamContext as it seems to be causing issues
// const teamContext: TeamContext = { project };

export const getTasks = async () => {
  console.log('Requesting all active tasks from Azure Boards...');
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);

  const witApi = await connection.getWorkItemTrackingApi();

  const allIdsQuery = {
    query: "Select [System.Id] From WorkItems"
  };

  try {
    const queryResult = await witApi.queryByWiql(allIdsQuery);
    const allWorkItemIds = queryResult?.workItems?.map(item => item.id as number) || [];

    if (allWorkItemIds.length === 0) {
      console.log('No work items found in Azure Boards.');
      return [];
    }

    console.log(`Found ${allWorkItemIds.length} total work items. Fetching details...`);

    const batchSize = 200;
    let allWorkItems: any[] = [];

    for (let i = 0; i < allWorkItemIds.length; i += batchSize) {
      const batchIds = allWorkItemIds.slice(i, i + batchSize);
      const workItemsBatch = await witApi.getWorkItems(batchIds, ['System.Id', 'System.Title', 'System.State', 'System.WorkItemType']);
      if (workItemsBatch) {
        allWorkItems = allWorkItems.concat(workItemsBatch);
      }
    }

    if (allWorkItems.length === 0) {
        console.log('No work item details could be fetched.');
        return [];
    }

    const filteredTasks = allWorkItems.filter(workItem => {
      const workItemType = workItem.fields!['System.WorkItemType'];
      const state = workItem.fields!['System.State'];
      return workItemType === 'Task' && state !== 'Closed' && state !== 'Removed';
    });

    console.log(`Found ${filteredTasks.length} active tasks.`);

    return filteredTasks.map(workItem => ({
      id: workItem.id,
      title: workItem.fields!['System.Title'],
      state: workItem.fields!['System.State'],
      type: workItem.fields!['System.WorkItemType'],
    }));

  } catch (error) {
    console.error('Error fetching tasks from Azure Boards:', error);
    throw error;
  }
};

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
};

export const getTaskDescription = async (taskId: number) => {
  console.log(`Requesting description for task ID: ${taskId}...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  try {
    const workItem = await witApi.getWorkItem(taskId);
    console.log(`Successfully fetched description for task ID: ${taskId}.`);
    return {
      id: workItem.id,
      title: workItem.fields!['System.Title'],
      state: workItem.fields!['System.State'],
      type: workItem.fields!['System.WorkItemType'],
      description: stripHtml(workItem.fields!['System.Description'] || workItem.fields!['Microsoft.VSTS.TCM.ReproSteps'])
    };
  } catch (error) {
    console.error(`Error fetching description for task ID ${taskId}:`, error);
    throw error;
  }
};

export const countAllTasks = async () => {
  console.log('Requesting total count of all tasks...');
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  const query = {
    query: "Select [System.Id] From WorkItems Where [System.WorkItemType] = 'Task'"
  };

  try {
    const queryResult = await witApi.queryByWiql(query);
    const count = queryResult?.workItems?.length || 0;
    console.log(`Found ${count} total tasks.`);
    return { count };
  } catch (error) {
    console.error('Error counting all tasks:', error);
    throw error;
  }
};


export const getChildTasks = async (parentId: number) => {
  console.log(`Requesting child tasks for parent ID: ${parentId}...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  const query = {
    query: `Select [System.Id], [System.Title], [System.State], [System.WorkItemType] From WorkItems Where [System.Parent] = ${parentId} AND [System.WorkItemType] IN ('Task', 'User Story', 'Epic')`
  };

  try {
    const queryResult = await witApi.queryByWiql(query);
    if (!queryResult?.workItems || queryResult.workItems.length === 0) {
      console.log(`No child tasks found for parent ID: ${parentId}.`);
      return [];
    }
    const taskIds = queryResult.workItems?.map(item => item.id as number) || [];
    console.log(`Found ${taskIds.length} child tasks. Fetching details...`);
    const workItems = await witApi.getWorkItems(taskIds, ['System.Id', 'System.Title', 'System.State', 'System.WorkItemType']);
    return workItems.map(workItem => ({
      id: workItem.id,
      title: workItem.fields!['System.Title'],
      state: workItem.fields!['System.State'],
      type: workItem.fields!['System.WorkItemType'],
    }));
  } catch (error) {
    console.error(`Error fetching child tasks for parent ID ${parentId}:`, error);
    throw error;
  }
};

export const getTasksByType = async (taskType: 'Epic' | 'User Story' | 'Task') => {
  console.log(`Requesting tasks of type: ${taskType}...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  const query = {
    query: `Select [System.Id], [System.Title], [System.State], [System.WorkItemType] From WorkItems Where [System.WorkItemType] = '${taskType}'`
  };

  try {
    const queryResult = await witApi.queryByWiql(query);
    if (!queryResult?.workItems || queryResult.workItems.length === 0) {
      console.log(`No tasks found for type: ${taskType}.`);
      return [];
    }
    const taskIds = queryResult.workItems?.map(item => item.id as number) || [];
    console.log(`Found ${taskIds.length} tasks of type ${taskType}. Fetching details...`);
    const workItems = await witApi.getWorkItems(taskIds, ['System.Id', 'System.Title', 'System.State', 'System.WorkItemType']);
    return workItems.map(workItem => ({
      id: workItem.id,
      title: workItem.fields!['System.Title'],
      state: workItem.fields!['System.State'],
      type: workItem.fields!['System.WorkItemType'],
    }));
  } catch (error) {
    console.error(`Error fetching tasks of type ${taskType}:`, error);
    throw error;
  }
};

export const getSprintUserStoriesWithChildren = async (sprintPath: string) => {
  console.log(`Requesting User Stories and their children for sprint: ${sprintPath}...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  const query = {
    query: `Select [System.Id], [System.Title], [System.State], [System.WorkItemType] From WorkItems Where [System.IterationPath] = '${sprintPath}'`
  };

  try {
    const queryResult = await witApi.queryByWiql(query);
    const userStoryIds = queryResult?.workItems?.map(item => item.id as number) || [];

    if (userStoryIds.length === 0) {
      console.log(`No User Stories found in sprint: ${sprintPath}.`);
      return [];
    }

    console.log(`Found ${userStoryIds.length} User Stories in ${sprintPath}. Fetching details and children...`);

    const userStories = await witApi.getWorkItems(userStoryIds, ['System.Id', 'System.Title', 'System.State', 'System.WorkItemType']);

    const results = await Promise.all(userStories.map(async (story) => {
        const children = await getChildTasks(story.id as number);
        return {
            id: story.id,
            title: story.fields!['System.Title'],
            state: story.fields!['System.State'],
            type: story.fields!['System.WorkItemType'],
            children: children
        };
    }));

    return results;

  } catch (error) {
    console.error(`Error fetching sprint report for ${sprintPath}:`, error);
    throw error;
  }
};

export const listTeamIterations = async (timeframe?: 'current' | 'past' | 'future') => {
  console.log(`Requesting team iterations (timeframe=${timeframe ?? 'all'})...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const workApi = await connection.getWorkApi();
  const teamContext: TeamContext = { project, team };

  try {
    const iterations = await workApi.getTeamIterations(teamContext, timeframe);
    return (iterations || []).map(it => ({
      id: it.id,
      name: it.name,
      path: it.path,
      startDate: it.attributes?.startDate,
      finishDate: it.attributes?.finishDate,
      timeFrame: it.attributes?.timeFrame,
    }));
  } catch (error: any) {
    console.error('Error listing team iterations:', error);
    throw error;
  }
};

const resolveIteration = (iterations: Array<{ id?: string; name?: string }>, query: string) => {
  const raw = (query || '').trim();
  if (!raw) return undefined;
  const q = raw.toLowerCase();

  // 1) id exato
  const byId = iterations.find(i => i.id === raw);
  if (byId) return byId;

  // 2) nome exato (case-insensitive)
  const byName = iterations.find(i => (i.name || '').toLowerCase() === q);
  if (byName) return byName;

  // 3) número puro ("32" ou "iteration 32") -> nome termina com " 32"
  const numMatch = q.match(/(\d+)\s*$/);
  if (numMatch) {
    const num = numMatch[1];
    const byNumber = iterations.find(i => new RegExp(`\\b${num}$`).test(i.name || ''));
    if (byNumber) return byNumber;
  }

  // 4) substring no nome
  const bySubstr = iterations.find(i => (i.name || '').toLowerCase().includes(q));
  if (bySubstr) return bySubstr;

  return undefined;
};

export const getIterationTasks = async (iterationQuery: string, opts?: { onlyTasks?: boolean }) => {
  console.log(`Requesting work items for iteration query: "${iterationQuery}"...`);
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const workApi = await connection.getWorkApi();
  const witApi = await connection.getWorkItemTrackingApi();
  const teamContext: TeamContext = { project, team };

  const iterations = await listTeamIterations();
  const match = resolveIteration(iterations as any, iterationQuery);
  if (!match || !match.id) {
    throw new Error(`Iteration not found for query: "${iterationQuery}"`);
  }

  const rels = await workApi.getIterationWorkItems(teamContext, match.id);
  const relations = rels?.workItemRelations || [];

  const idSet = new Set<number>();
  for (const r of relations) {
    if (r.source?.id) idSet.add(r.source.id);
    if (r.target?.id) idSet.add(r.target.id);
  }
  const ids = Array.from(idSet);

  if (ids.length === 0) {
    return { iteration: match, items: [], tree: [] };
  }

  const fields = [
    'System.Id', 'System.Title', 'System.State', 'System.WorkItemType',
    'System.Parent', 'System.AssignedTo', 'System.IterationPath',
  ];
  const batchSize = 200;
  let allItems: any[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const part = await witApi.getWorkItems(batch, fields);
    if (part) allItems = allItems.concat(part);
  }

  const mapped = allItems.map(wi => ({
    id: wi.id as number,
    title: wi.fields!['System.Title'],
    state: wi.fields!['System.State'],
    type: wi.fields!['System.WorkItemType'],
    assignedTo: wi.fields!['System.AssignedTo']?.displayName,
    iterationPath: wi.fields!['System.IterationPath'],
    parentId: wi.fields!['System.Parent'],
  }));

  const items = opts?.onlyTasks ? mapped.filter(i => i.type === 'Task') : mapped;

  // árvore parent->children a partir de workItemRelations
  const byId = new Map<number, any>();
  for (const it of mapped) byId.set(it.id, { ...it, children: [] as any[] });

  const childIds = new Set<number>();
  for (const r of relations) {
    if (r.rel && r.source?.id && r.target?.id) {
      const parent = byId.get(r.source.id);
      const child = byId.get(r.target.id);
      if (parent && child) {
        parent.children.push(child);
        childIds.add(child.id);
      }
    }
  }
  const tree = Array.from(byId.values()).filter(n => !childIds.has(n.id));

  console.log(`Iteration "${match.name}": ${items.length} items returned.`);
  return { iteration: match, items, tree };
};

export const listSprints = async () => {
  console.log('Requesting list of sprints...');
  const authHandler = ado.getPersonalAccessTokenHandler(token);
  const connection = new ado.WebApi(orgUrl, authHandler);
  const witApi = await connection.getWorkItemTrackingApi();

  try {
    const rootNode = await witApi.getClassificationNode(project, TreeStructureGroup.Iterations);

    if (!rootNode) {
        console.log(`Root node not found for project: ${project}`);
        return [{ debug: "Root node not found", project }];
    }

    const sprints: any[] = [];

    const collectSprints = (node: any, pathPrefix: string) => {
        let currentPath: string;
        if (!pathPrefix) {
            currentPath = node.name;
        } else {
            currentPath = `${pathPrefix}\\${node.name}`;
        }
        
        sprints.push({
            name: node.name,
            path: currentPath,
            hasChildren: !!(node.children && node.children.length > 0),
            attributes: node.attributes
        });
        
        if (node.children) {
            node.children.forEach((child: any) => collectSprints(child, currentPath));
        }
    };

    collectSprints(rootNode, "");

    console.log(`Found ${sprints.length} sprints/iterations.`);
    return sprints;

  } catch (error: any) {
    console.error('Error listing sprints:', error);
    return [{ error: error.message, stack: error.stack }];
  }
};