import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as user from "./handlers/user.js";

export function registerUserTools(server: McpServer) {
  server.registerTool(
    "current_user",
    {
      title: "Current User",
      description: "Get current signed-in user.",
      inputSchema: {},
    },
    user.currentUserHandler,
  );
}
