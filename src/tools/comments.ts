import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as comments from "./handlers/comments.js";

export function registerCommentTools(server: McpServer) {
  server.registerTool(
    "list_comments",
    {
      title: "List Comments",
      description: "List comments of a doc (with replies).",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        first: z.number().optional(),
        offset: z.number().optional(),
        after: z.string().optional(),
      },
    },
    comments.listCommentsHandler,
  );

  server.registerTool(
    "create_comment",
    {
      title: "Create Comment",
      description: "Create a comment on a doc.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        docTitle: z.string().optional(),
        docMode: z.enum(["Page", "Edgeless", "page", "edgeless"]).optional(),
        content: z.any(),
        mentions: z.array(z.string()).optional(),
      },
    },
    comments.createCommentHandler,
  );

  server.registerTool(
    "update_comment",
    {
      title: "Update Comment",
      description: "Update a comment content.",
      inputSchema: {
        id: z.string(),
        content: z.any(),
      },
    },
    comments.updateCommentHandler,
  );

  server.registerTool(
    "delete_comment",
    {
      title: "Delete Comment",
      description: "Delete a comment by id.",
      inputSchema: {
        id: z.string(),
      },
    },
    comments.deleteCommentHandler,
  );

  server.registerTool(
    "resolve_comment",
    {
      title: "Resolve Comment",
      description: "Resolve or unresolve a comment.",
      inputSchema: {
        id: z.string(),
        resolved: z.boolean(),
      },
    },
    comments.resolveCommentHandler,
  );
}
