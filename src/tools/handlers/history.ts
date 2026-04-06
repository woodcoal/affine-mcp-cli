import { text, getGraphQLClient, getDefaultWorkspaceId } from "./utils.js";

/**
 * 列出文档历史记录（时间戳）
 */
export async function listHistoriesHandler(params: {
  workspaceId?: string;
  guid: string;
  take?: number;
  before?: string;
}) {
  const gql = getGraphQLClient();
  const { guid, take, before } = params;

  const workspaceId = params.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId)
    throw new Error("workspaceId required (or set AFFINE_WORKSPACE_ID)");

  const query = `query Histories($workspaceId:String!,$guid:String!,$take:Int,$before:DateTime){ workspace(id:$workspaceId){ histories(guid:$guid, take:$take, before:$before){ id timestamp workspaceId } } }`;
  const data = await gql.request<{ workspace: any }>(query, {
    workspaceId,
    guid,
    take,
    before,
  });
  return text(data.workspace.histories);
}
