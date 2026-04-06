import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as organize from "../core/organize.js";

export function registerOrganizeTools(server: McpServer) {
  server.registerTool(
    "list_collections",
    {
      title: "List Collections",
      description: "List AFFiNE collections stored in the workspace sidebar.",
      inputSchema: {
        workspaceId: z.string().optional(),
      },
    },
    organize.listCollectionsHandler,
  );

  server.registerTool(
    "get_collection",
    {
      title: "Get Collection",
      description: "Get an AFFiNE collection by id.",
      inputSchema: {
        workspaceId: z.string().optional(),
        collectionId: z.string(),
      },
    },
    organize.getCollectionHandler,
  );

  server.registerTool(
    "create_collection",
    {
      title: "Create Collection",
      description: "Create a new AFFiNE collection in the workspace sidebar.",
      inputSchema: {
        workspaceId: z.string().optional(),
        name: z.string(),
      },
    },
    organize.createCollectionHandler,
  );

  server.registerTool(
    "update_collection",
    {
      title: "Update Collection",
      description: "Rename an AFFiNE collection.",
      inputSchema: {
        workspaceId: z.string().optional(),
        collectionId: z.string(),
        name: z.string().optional(),
      },
    },
    organize.updateCollectionHandler,
  );

  server.registerTool(
    "delete_collection",
    {
      title: "Delete Collection",
      description: "Delete an AFFiNE collection from the workspace sidebar.",
      inputSchema: {
        workspaceId: z.string().optional(),
        collectionId: z.string(),
      },
    },
    organize.deleteCollectionHandler,
  );

  server.registerTool(
    "add_doc_to_collection",
    {
      title: "Add Doc To Collection",
      description: "Add a document id to an AFFiNE collection allow-list.",
      inputSchema: {
        workspaceId: z.string().optional(),
        collectionId: z.string(),
        docId: z.string(),
      },
    },
    organize.addDocToCollectionHandler,
  );

  server.registerTool(
    "remove_doc_from_collection",
    {
      title: "Remove Doc From Collection",
      description: "Remove a document id from an AFFiNE collection allow-list.",
      inputSchema: {
        workspaceId: z.string().optional(),
        collectionId: z.string(),
        docId: z.string(),
      },
    },
    organize.removeDocFromCollectionHandler,
  );

  server.registerTool(
    "list_organize_nodes",
    {
      title: "List Organize Nodes",
      description:
        "Experimental: list AFFiNE sidebar organize nodes from the folders workspace DB.",
      inputSchema: {
        workspaceId: z.string().optional(),
      },
    },
    organize.listOrganizeNodesHandler,
  );

  server.registerTool(
    "create_folder",
    {
      title: "Create Folder",
      description: "Experimental: create an AFFiNE organize folder node.",
      inputSchema: {
        workspaceId: z.string().optional(),
        name: z.string(),
        parentId: z.string().nullable().optional(),
        index: z.string().optional(),
      },
    },
    organize.createFolderHandler,
  );

  server.registerTool(
    "rename_folder",
    {
      title: "Rename Folder",
      description: "Experimental: rename an AFFiNE organize folder node.",
      inputSchema: {
        workspaceId: z.string().optional(),
        folderId: z.string(),
        name: z.string(),
      },
    },
    organize.renameFolderHandler,
  );

  server.registerTool(
    "delete_folder",
    {
      title: "Delete Folder",
      description:
        "Experimental: delete an AFFiNE organize folder and all nested nodes.",
      inputSchema: {
        workspaceId: z.string().optional(),
        folderId: z.string(),
      },
    },
    organize.deleteFolderHandler,
  );

  server.registerTool(
    "move_organize_node",
    {
      title: "Move Organize Node",
      description: "Experimental: move an AFFiNE organize folder or link node.",
      inputSchema: {
        workspaceId: z.string().optional(),
        nodeId: z.string(),
        parentId: z.string().nullable().optional(),
        index: z.string().optional(),
      },
    },
    organize.moveOrganizeNodeHandler,
  );

  server.registerTool(
    "add_organize_link",
    {
      title: "Add Organize Link",
      description:
        "Experimental: add a doc/tag/collection link under an AFFiNE organize folder.",
      inputSchema: {
        workspaceId: z.string().optional(),
        folderId: z.string(),
        type: z.enum(["doc", "tag", "collection"]),
        targetId: z.string(),
        index: z.string().optional(),
      },
    },
    organize.addOrganizeLinkHandler,
  );

  server.registerTool(
    "delete_organize_link",
    {
      title: "Delete Organize Link",
      description:
        "Experimental: delete an AFFiNE organize doc/tag/collection link.",
      inputSchema: {
        workspaceId: z.string().optional(),
        nodeId: z.string(),
      },
    },
    organize.deleteOrganizeLinkHandler,
  );
}
