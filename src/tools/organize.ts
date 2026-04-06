import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as organize from "./handlers/organize.js";

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
    (params: organize.ListCollectionsParams) => organize.listCollectionsHandler(params) as any
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
    (params: organize.GetCollectionParams) => organize.getCollectionHandler(params) as any
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
    (params: organize.CreateCollectionParams) => organize.createCollectionHandler(params) as any
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
    (params: organize.UpdateCollectionParams) => organize.updateCollectionHandler(params) as any
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
    (params: organize.DeleteCollectionParams) => organize.deleteCollectionHandler(params) as any
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
    (params: organize.AddDocToCollectionParams) => organize.addDocToCollectionHandler(params) as any
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
    (params: organize.RemoveDocFromCollectionParams) => organize.removeDocFromCollectionHandler(params) as any
  );

  server.registerTool(
    "list_organize_nodes",
    {
      title: "List Organize Nodes",
      description: "Experimental: list AFFiNE sidebar organize nodes from the folders workspace DB.",
      inputSchema: {
        workspaceId: z.string().optional(),
      },
    },
    (params: organize.ListOrganizeNodesParams) => organize.listOrganizeNodesHandler(params) as any
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
    (params: organize.CreateFolderParams) => organize.createFolderHandler(params) as any
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
    (params: organize.RenameFolderParams) => organize.renameFolderHandler(params) as any
  );

  server.registerTool(
    "delete_folder",
    {
      title: "Delete Folder",
      description: "Experimental: delete an AFFiNE organize folder and all nested nodes.",
      inputSchema: {
        workspaceId: z.string().optional(),
        folderId: z.string(),
      },
    },
    (params: organize.DeleteFolderParams) => organize.deleteFolderHandler(params) as any
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
    (params: organize.MoveOrganizeNodeParams) => organize.moveOrganizeNodeHandler(params) as any
  );

  server.registerTool(
    "add_organize_link",
    {
      title: "Add Organize Link",
      description: "Experimental: add a doc/tag/collection link under an AFFiNE organize folder.",
      inputSchema: {
        workspaceId: z.string().optional(),
        folderId: z.string(),
        type: z.enum(["doc", "tag", "collection"]),
        targetId: z.string(),
        index: z.string().optional(),
      },
    },
    (params: organize.AddOrganizeLinkParams) => organize.addOrganizeLinkHandler(params) as any
  );

  server.registerTool(
    "delete_organize_link",
    {
      title: "Delete Organize Link",
      description: "Experimental: delete an AFFiNE organize doc/tag/collection link.",
      inputSchema: {
        workspaceId: z.string().optional(),
        nodeId: z.string(),
      },
    },
    (params: organize.DeleteOrganizeLinkParams) => organize.deleteOrganizeLinkHandler(params) as any
  );
}
