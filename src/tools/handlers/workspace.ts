import { text } from "../../util/mcp.js";
import {
  connectWorkspaceSocket,
  joinWorkspace,
  pushDocUpdate,
  wsUrlFromGraphQLEndpoint,
} from "../../ws.js";
import { getGraphQLClient } from "./graphqlClient.js";
import * as Y from "yjs";
import FormData from "form-data";
import fetch from "node-fetch";

/**
 * 生成 AFFiNE 风格的文档 ID
 */
function generateDocId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * 创建初始工作区数据（包含一个文档）
 */
function createInitialWorkspaceData(
  workspaceName: string = "New Workspace",
  avatar: string = "",
) {
  const rootDoc = new Y.Doc();

  const meta = rootDoc.getMap("meta");
  meta.set("name", workspaceName);
  meta.set("avatar", avatar);

  const pages = new Y.Array();
  const firstDocId = generateDocId();

  const pageMetadata = new Y.Map();
  pageMetadata.set("id", firstDocId);
  pageMetadata.set("title", "Welcome to " + workspaceName);
  pageMetadata.set("createDate", Date.now());
  pageMetadata.set("tags", new Y.Array());

  pages.push([pageMetadata]);
  meta.set("pages", pages);

  const setting = rootDoc.getMap("setting");
  setting.set("collections", new Y.Array());

  const workspaceUpdate = Y.encodeStateAsUpdate(rootDoc);

  const docYDoc = new Y.Doc();
  const blocks = docYDoc.getMap("blocks");

  const pageId = generateDocId();
  const pageBlock = new Y.Map();
  pageBlock.set("sys:id", pageId);
  pageBlock.set("sys:flavour", "affine:page");

  const titleText = new Y.Text();
  titleText.insert(0, "Welcome to " + workspaceName);
  pageBlock.set("prop:title", titleText);

  const pageChildren = new Y.Array();
  pageBlock.set("sys:children", pageChildren);

  blocks.set(pageId, pageBlock);

  const surfaceId = generateDocId();
  const surfaceBlock = new Y.Map();
  surfaceBlock.set("sys:id", surfaceId);
  surfaceBlock.set("sys:flavour", "affine:surface");
  surfaceBlock.set("sys:parent", null);
  surfaceBlock.set("sys:children", new Y.Array());

  blocks.set(surfaceId, surfaceBlock);
  pageChildren.push([surfaceId]);

  const noteId = generateDocId();
  const noteBlock = new Y.Map();
  noteBlock.set("sys:id", noteId);
  noteBlock.set("sys:flavour", "affine:note");
  noteBlock.set("sys:parent", null);
  noteBlock.set("prop:displayMode", "DocAndEdgeless");
  noteBlock.set("prop:xywh", "[0,0,800,600]");
  noteBlock.set("prop:index", "a0");
  noteBlock.set("prop:lockedBySelf", false);

  const noteChildren = new Y.Array();
  noteBlock.set("sys:children", noteChildren);

  blocks.set(noteId, noteBlock);
  pageChildren.push([noteId]);

  const paragraphId = generateDocId();
  const paragraphBlock = new Y.Map();
  paragraphBlock.set("sys:id", paragraphId);
  paragraphBlock.set("sys:flavour", "affine:paragraph");
  paragraphBlock.set("sys:parent", null);
  paragraphBlock.set("sys:children", new Y.Array());
  paragraphBlock.set("prop:type", "text");

  const paragraphText = new Y.Text();
  paragraphText.insert(0, "This workspace was created by AFFiNE MCP Server");
  paragraphBlock.set("prop:text", paragraphText);

  blocks.set(paragraphId, paragraphBlock);
  noteChildren.push([paragraphId]);

  const docMeta = docYDoc.getMap("meta");
  docMeta.set("id", firstDocId);
  docMeta.set("title", "Welcome to " + workspaceName);
  docMeta.set("createDate", Date.now());
  docMeta.set("tags", new Y.Array());
  docMeta.set("version", 1);

  const docUpdate = Y.encodeStateAsUpdate(docYDoc);

  return {
    workspaceUpdate,
    firstDocId,
    docUpdate,
  };
}

/**
 * 列出所有工作区
 */
export async function listWorkspacesHandler() {
  const gql = getGraphQLClient();
  try {
    const query = `query { workspaces { id public enableAi createdAt } }`;
    const data = await gql.request<{ workspaces: any[] }>(query);
    return text(data.workspaces || []);
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 获取指定工作区详情
 */
export async function getWorkspaceHandler(params: { id: string }) {
  const { id } = params;
  const gql = getGraphQLClient();
  try {
    const query = `query GetWorkspace($id: String!) {
      workspace(id: $id) {
        id
        public
        enableAi
        createdAt
        permissions {
          Workspace_Read
          Workspace_CreateDoc
        }
      }
    }`;
    const data = await gql.request<{ workspace: any }>(query, { id });
    return text(data.workspace);
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 创建新工作区
 */
export async function createWorkspaceHandler(params: {
  name: string;
  avatar?: string;
}) {
  const { name, avatar } = params;
  const gql = getGraphQLClient();
  try {
    const endpoint = gql.endpoint;
    const headers = gql.headers;
    const cookie = gql.cookie;
    const bearer = gql.bearer;

    const { workspaceUpdate, firstDocId, docUpdate } =
      createInitialWorkspaceData(name, avatar || "");

    const initData = Buffer.from(workspaceUpdate);

    const form = new FormData();

    form.append(
      "operations",
      JSON.stringify({
        name: "createWorkspace",
        query: `mutation createWorkspace($init: Upload!) {
        createWorkspace(init: $init) {
          id
          public
          createdAt
          enableAi
        }
      }`,
        variables: { init: null },
      }),
    );

    form.append("map", JSON.stringify({ "0": ["variables.init"] }));

    form.append("0", initData, {
      filename: "init.yjs",
      contentType: "application/octet-stream",
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...headers,
        Cookie: cookie,
        ...form.getHeaders(),
      },
      body: form as any,
    });

    const result = (await response.json()) as any;

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    const workspace = result.data.createWorkspace;
    const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
    const baseUrl =
      process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, "");

    try {
      const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
      try {
        await joinWorkspace(socket, workspace.id);
        const docUpdateBase64 = Buffer.from(docUpdate).toString("base64");
        await pushDocUpdate(socket, workspace.id, firstDocId, docUpdateBase64);
      } finally {
        socket.disconnect();
      }
    } catch (_wsError) {
      return text({
        ...workspace,
        name,
        avatar,
        firstDocId,
        status: "partial",
        message: "Workspace created (document sync may be pending)",
        url: `${baseUrl}/workspace/${workspace.id}`,
      });
    }

    return text({
      ...workspace,
      name,
      avatar,
      firstDocId,
      status: "success",
      message: "Workspace created successfully",
      url: `${baseUrl}/workspace/${workspace.id}`,
    });
  } catch (error: any) {
    return text({ error: error.message, status: "failed" });
  }
}

/**
 * 更新工作区设置
 */
export async function updateWorkspaceHandler(params: {
  id: string;
  public?: boolean;
  enableAi?: boolean;
}) {
  const { id, public: isPublic, enableAi } = params;
  const gql = getGraphQLClient();
  try {
    const mutation = `
      mutation UpdateWorkspace($input: UpdateWorkspaceInput!) {
        updateWorkspace(input: $input) {
          id
          public
          enableAi
        }
      }
    `;

    const input: any = { id };
    if (isPublic !== undefined) input.public = isPublic;
    if (enableAi !== undefined) input.enableAi = enableAi;

    const data = await gql.request<{ updateWorkspace: any }>(mutation, {
      input,
    });

    return text(data.updateWorkspace);
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 删除工作区
 */
export async function deleteWorkspaceHandler(params: { id: string }) {
  const { id } = params;
  const gql = getGraphQLClient();
  try {
    const mutation = `
      mutation DeleteWorkspace($id: String!) {
        deleteWorkspace(id: $id)
      }
    `;

    const data = await gql.request<{ deleteWorkspace: boolean }>(mutation, {
      id,
    });

    return text({
      success: data.deleteWorkspace,
      message: "Workspace deleted successfully",
    });
  } catch (error: any) {
    return text({ error: error.message });
  }
}
