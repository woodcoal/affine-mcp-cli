import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as workspace from "./handlers/workspace.js";

export function registerWorkspaceTools(server: McpServer) {
  server.registerTool(
    "list_workspaces",
    {
      title: "List Workspaces",
      description: "List all available AFFiNE workspaces",
      inputSchema: {
        format: z
          .enum(["text", "json"])
          .optional()
          .describe("Return format: text or json (default: text)"),
      },
    },
    workspace.listWorkspacesHandler,
  );

  server.registerTool(
    "get_workspace",
    {
      title: "Get Workspace",
      description: "Get details of a specific workspace",
      inputSchema: {
        id: z.string().describe("Workspace ID"),
        format: z
          .enum(["text", "json"])
          .optional()
          .describe("Return format: text or json (default: text)"),
      },
    },
    workspace.getWorkspaceHandler,
  );

  server.registerTool(
    "create_workspace",
    {
      title: "Create Workspace",
      description:
        "Create a new workspace with initial document (accessible in UI)",
      inputSchema: {
        name: z.string().describe("Workspace name"),
        avatar: z.string().optional().describe("Avatar emoji or URL"),
        format: z
          .enum(["text", "json"])
          .optional()
          .describe("Return format: text or json (default: text)"),
      },
    },
    workspace.createWorkspaceHandler,
  );

  server.registerTool(
    "update_workspace",
    {
      title: "Update Workspace",
      description: "Update workspace settings",
      inputSchema: {
        id: z.string().describe("Workspace ID"),
        public: z.boolean().optional().describe("Make workspace public"),
        enableAi: z.boolean().optional().describe("Enable AI features"),
        format: z
          .enum(["text", "json"])
          .optional()
          .describe("Return format: text or json (default: text)"),
      },
    },
    workspace.updateWorkspaceHandler,
  );

  server.registerTool(
    "delete_workspace",
    {
      title: "Delete Workspace",
      description: "Delete a workspace permanently",
      inputSchema: {
        id: z.string().describe("Workspace ID"),
        format: z
          .enum(["text", "json"])
          .optional()
          .describe("Return format: text or json (default: text)"),
      },
    },
    workspace.deleteWorkspaceHandler,
  );
}
