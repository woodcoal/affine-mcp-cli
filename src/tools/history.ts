import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as history from "./handlers/history.js";

export function registerHistoryTools(server: McpServer) {
  server.registerTool(
    "list_histories",
    {
      title: "List Histories",
      description: "List doc histories (timestamps) for a doc.",
      inputSchema: {
        workspaceId: z.string().optional(),
        guid: z.string(),
        take: z.number().optional(),
        before: z.string().optional(),
      },
    },
    history.listHistoriesHandler,
  );
}
