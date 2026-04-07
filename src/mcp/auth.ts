import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as auth from "../core/auth.js";

export function registerAuthTools(server: McpServer) {
  server.registerTool(
    "sign_in",
    {
      title: "Sign In",
      description:
        "Sign in to AFFiNE using email and password; sets session cookies for subsequent calls.",
      inputSchema: {
        email: z.string().email(),
        password: z.string().min(1),
      },
    },
    auth.signInHandler as any,
  );
}
