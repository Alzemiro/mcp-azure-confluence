import * as ado from 'azure-devops-node-api';
import { WorkItemExpand } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces';
import { TeamContext } from 'azure-devops-node-api/interfaces/CoreInterfaces';

const orgUrl = process.env.AZURE_DEVOPS_ORG_URL;
const token = process.env.AZURE_DEVOPS_PAT;
const project = process.env.AZURE_DEVOPS_PROJECT;

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