import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as notifications from "../core/notifications.js";

export function registerNotificationTools(server: McpServer) {
  server.registerTool(
    "list_notifications",
    {
      title: "List Notifications",
      description: "Get user notifications.",
      inputSchema: {
        first: z.number().optional(),
        offset: z.number().optional(),
        after: z.string().optional(),
        unreadOnly: z.boolean().optional(),
      },
    },
    notifications.listNotificationsHandler,
  );

  server.registerTool(
    "read_all_notifications",
    {
      title: "Mark All Notifications Read",
      description: "Mark all notifications as read.",
      inputSchema: {},
    },
    notifications.readAllNotificationsHandler,
  );
}
