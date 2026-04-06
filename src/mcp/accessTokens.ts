import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as accessTokens from "../core/accessTokens.js";

export function registerAccessTokenTools(server: McpServer) {
  server.registerTool(
    "list_access_tokens",
    {
      title: "List Access Tokens",
      description: "List personal access tokens (metadata).",
      inputSchema: {},
    },
    accessTokens.listAccessTokensHandler,
  );

  server.registerTool(
    "generate_access_token",
    {
      title: "Generate Access Token",
      description: "Generate a personal access token (returns token).",
      inputSchema: {
        name: z.string(),
        expiresAt: z.string().optional(),
      },
    },
    accessTokens.generateAccessTokenHandler,
  );

  server.registerTool(
    "revoke_access_token",
    {
      title: "Revoke Access Token",
      description: "Revoke a personal access token by id.",
      inputSchema: {
        id: z.string(),
      },
    },
    accessTokens.revokeAccessTokenHandler,
  );
}
