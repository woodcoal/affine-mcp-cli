import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as blobStorage from "./handlers/blobStorage.js";

export function registerBlobTools(server: McpServer) {
  server.registerTool(
    "upload_blob",
    {
      title: "Upload Blob",
      description: "Upload a file or blob to workspace storage.",
      inputSchema: {
        workspaceId: z.string().describe("Workspace ID"),
        content: z.string().describe("Base64 encoded content or text"),
        filename: z.string().optional().describe("Filename"),
        contentType: z.string().optional().describe("MIME type"),
      },
    },
    blobStorage.uploadBlobHandler,
  );

  server.registerTool(
    "delete_blob",
    {
      title: "Delete Blob",
      description: "Delete a blob/file from workspace storage.",
      inputSchema: {
        workspaceId: z.string().describe("Workspace ID"),
        key: z.string().describe("Blob key/ID to delete"),
        permanently: z.boolean().optional().describe("Delete permanently"),
      },
    },
    blobStorage.deleteBlobHandler,
  );

  server.registerTool(
    "cleanup_blobs",
    {
      title: "Cleanup Deleted Blobs",
      description: "Permanently remove deleted blobs to free up storage.",
      inputSchema: {
        workspaceId: z.string().describe("Workspace ID"),
      },
    },
    blobStorage.cleanupBlobsHandler,
  );
}
