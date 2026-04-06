import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as userCRUD from "../core/userCRUD.js";

export function registerUserCRUDTools(server: McpServer) {
  server.registerTool(
    "update_profile",
    {
      title: "Update Profile",
      description: "Update current user's profile information.",
      inputSchema: {
        name: z.string().optional().describe("Display name"),
        avatarUrl: z.string().optional().describe("Avatar URL"),
      },
    },
    userCRUD.updateProfileHandler,
  );

  server.registerTool(
    "update_settings",
    {
      title: "Update Settings",
      description: "Update user settings and preferences.",
      inputSchema: {
        settings: z
          .object({
            receiveCommentEmail: z.boolean().optional(),
            receiveInvitationEmail: z.boolean().optional(),
            receiveMentionEmail: z.boolean().optional(),
          })
          .describe("User notification settings"),
      },
    },
    userCRUD.updateSettingsHandler,
  );
}
