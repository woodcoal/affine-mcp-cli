import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";
import FormData from "form-data";
import fetch from "node-fetch";

function decodeBlobContent(content: string): Buffer {
  const normalized = content.trim().replace(/\s+/g, "");
  const base64Like = normalized.length > 0 && normalized.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(normalized);
  if (base64Like) {
    try {
      const decoded = Buffer.from(normalized, "base64");
      if (decoded.length > 0) {
        return decoded;
      }
    } catch {
      // Fallback to UTF-8 text below.
    }
  }
  return Buffer.from(content, "utf8");
}

/**
 * 上传 blob 的参数类型
 */
export interface UploadBlobParams {
  workspaceId: string;
  content: string;
  filename?: string;
  contentType?: string;
}

/**
 * 删除 blob 的参数类型
 */
export interface DeleteBlobParams {
  workspaceId: string;
  key: string;
  permanently?: boolean;
}

/**
 * 清理 blob 的参数类型
 */
export interface CleanupBlobsParams {
  workspaceId: string;
}

/**
 * 上传 blob
 */
export async function uploadBlobHandler(params: UploadBlobParams) {
  const gql = getGraphQLClient();
  const { workspaceId, content, filename, contentType } = params;
  
  try {
    const endpoint = gql.endpoint;
    const headers = gql.headers;
    const cookie = gql.cookie;
    const payload = decodeBlobContent(content);
    const safeFilename = filename || `blob-${Date.now()}.bin`;
    const mime = contentType || "application/octet-stream";

    const form = new FormData();
    form.append("operations", JSON.stringify({
      query: `mutation SetBlob($workspaceId: String!, $blob: Upload!) {
        setBlob(workspaceId: $workspaceId, blob: $blob)
      }`,
      variables: {
        workspaceId,
        blob: null
      }
    }));
    form.append("map", JSON.stringify({ "0": ["variables.blob"] }));
    form.append("0", payload, { filename: safeFilename, contentType: mime });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...headers,
        Cookie: cookie,
        ...form.getHeaders(),
      },
      body: form as any,
    });
    const result = await response.json() as any;
    if (result.errors?.length) {
      throw new Error(result.errors[0].message);
    }
    const blobKey = result.data?.setBlob;
    if (!blobKey) {
      throw new Error("Upload succeeded but no blob key was returned.");
    }

    return text({
      id: blobKey,
      key: blobKey,
      workspaceId,
      filename: safeFilename,
      contentType: mime,
      size: payload.length,
      uploadedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 删除 blob
 */
export async function deleteBlobHandler(params: DeleteBlobParams) {
  const gql = getGraphQLClient();
  const { workspaceId, key, permanently = false } = params;
  
  try {
    const mutation = `
      mutation DeleteBlob($workspaceId: String!, $key: String!, $permanently: Boolean) {
        deleteBlob(workspaceId: $workspaceId, key: $key, permanently: $permanently)
      }
    `;
    
    const data = await gql.request<{ deleteBlob: boolean }>(mutation, {
      workspaceId,
      key,
      permanently
    });
    
    return text({ success: data.deleteBlob, key, workspaceId, permanently });
  } catch (error: any) {
    return text({ error: error.message });
  }
}

/**
 * 清理已删除的 blob
 */
export async function cleanupBlobsHandler(params: CleanupBlobsParams) {
  const gql = getGraphQLClient();
  const { workspaceId } = params;
  
  try {
    const mutation = `
      mutation ReleaseDeletedBlobs($workspaceId: String!) {
        releaseDeletedBlobs(workspaceId: $workspaceId)
      }
    `;
    
    const data = await gql.request<{ releaseDeletedBlobs: boolean }>(mutation, {
      workspaceId
    });
    
    return text({ success: true, workspaceId, blobsReleased: data.releaseDeletedBlobs });
  } catch (error: any) {
    return text({ error: error.message });
  }
}
