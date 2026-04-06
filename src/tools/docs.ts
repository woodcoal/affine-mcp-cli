import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GraphQLClient } from "../graphqlClient.js";

import * as crud from "./handlers/docs/crud.js";
import * as search from "./handlers/docs/search.js";
import * as tags from "./handlers/docs/tags.js";
import * as blocks from "./handlers/docs/blocks.js";
import * as markdown from "./handlers/docs/markdown.js";
import * as database from "./handlers/docs/database.js";
import * as publish from "./handlers/docs/publish.js";

// Re-exporting types and constants for compatibility
export {
  WorkspaceId,
  DocId,
  MarkdownContent,
  AppendBlockCanonicalType,
  AppendBlockLegacyType,
  AppendBlockListStyle,
  AppendBlockBookmarkStyle,
  AppendBlockDataViewMode,
  AppendPlacement,
  AppendBlockInput,
  NormalizedAppendBlockInput,
  CreateDocInput,
  CreateDocResult,
  DatabaseColumnDef,
  DatabaseViewColumnDef,
  DatabaseViewDef,
  DatabaseColumnLookup,
  DatabaseDocContext,
  WorkspaceTagOption,
  TAG_OPTION_COLORS,
  WorkspacePageEntry,
} from "./handlers/docs/util.js";

import {
  WorkspaceId,
  DocId,
  MarkdownContent,
  AppendBlockListStyle,
  AppendBlockBookmarkStyle,
  AppendBlockDataViewMode,
} from "./handlers/docs/util.js";

/**
 * Register all document-related tools.
 */
export function registerDocTools(
  server: McpServer,
  _gql: GraphQLClient,
  _defaults: { workspaceId?: string },
) {
  // CRUD
  server.registerTool(
    "list_docs",
    {
      title: "List Documents",
      description: "List documents in a workspace (GraphQL).",
      inputSchema: {
        workspaceId: z
          .string()
          .describe("Workspace ID (optional if default set).")
          .optional(),
        first: z.number().optional(),
        offset: z.number().optional(),
        after: z.string().optional(),
      },
    },
    crud.listDocsHandler as any,
  );

  server.registerTool(
    "get_doc",
    {
      title: "Get Document",
      description: "Get a document by ID (GraphQL metadata).",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
      },
    },
    crud.getDocHandler as any,
  );

  server.registerTool(
    "read_doc",
    {
      title: "Read Document Content",
      description:
        "Read document block content via WebSocket snapshot (blocks + plain text). Set includeMarkdown: true to also get the rendered markdown.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        includeMarkdown: z.boolean().optional(),
      },
    },
    crud.readDocHandler as any,
  );

  server.registerTool(
    "create_doc",
    {
      title: "Create Document",
      description: "Create a new AFFiNE document with optional content.",
      inputSchema: {
        workspaceId: z.string().optional(),
        title: z.string().optional(),
        content: z.string().optional(),
      },
    },
    crud.createDocHandler as any,
  );

  server.registerTool(
    "delete_doc",
    {
      title: "Delete Document",
      description: "Delete a document and remove from workspace list.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
      },
    },
    crud.deleteDocHandler as any,
  );

  server.registerTool(
    "update_doc_title",
    {
      title: "Update Document Title",
      description: "Rename a document.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        title: z.string(),
      },
    },
    crud.updateDocTitleHandler as any,
  );

  server.registerTool(
    "duplicate_doc",
    {
      title: "Duplicate Document",
      description:
        "Clone a document by copying its markdown content into a new doc.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        title: z.string().optional(),
        parentDocId: z.string().optional(),
      },
    },
    crud.duplicateDocHandler as any,
  );

  server.registerTool(
    "create_doc_from_template",
    {
      title: "Create Document from Template",
      description:
        "Clone a template doc and substitute {{variable}} placeholders.",
      inputSchema: {
        workspaceId: z.string().optional(),
        templateDocId: z.string(),
        title: z.string(),
        variables: z.record(z.string(), z.string()).optional(),
        parentDocId: z.string().optional(),
      },
    },
    crud.createDocFromTemplateHandler as any,
  );

  // Search
  server.registerTool(
    "search_docs",
    {
      title: "Search Documents by Title",
      description: "Fast title search via workspace metadata.",
      inputSchema: {
        workspaceId: z.string().optional(),
        query: z.string(),
        limit: z.number().optional(),
        matchMode: z.enum(["substring", "prefix", "exact"]).optional(),
        tag: z.string().optional(),
        sortBy: z.enum(["relevance", "updatedAt"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
      },
    },
    search.searchDocsHandler as any,
  );

  server.registerTool(
    "get_doc_by_title",
    {
      title: "Get Document By Title",
      description:
        "Find a document by title and return its content as markdown.",
      inputSchema: {
        workspaceId: z.string().optional(),
        query: z.string(),
        limit: z.number().optional(),
      },
    },
    search.getDocByTitleHandler as any,
  );

  server.registerTool(
    "list_workspace_tree",
    {
      title: "List Workspace Tree",
      description: "Returns the full document hierarchy as a tree.",
      inputSchema: {
        workspaceId: z.string().optional(),
        depth: z.number().optional(),
      },
    },
    search.listWorkspaceTreeHandler as any,
  );

  server.registerTool(
    "get_orphan_docs",
    {
      title: "Get Orphan Documents",
      description: "Find all documents that have no parent.",
      inputSchema: {
        workspaceId: z.string().optional(),
      },
    },
    search.getOrphanDocsHandler as any,
  );

  server.registerTool(
    "list_backlinks",
    {
      title: "List Backlinks",
      description: "Find all documents that embed-link to a given doc.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
      },
    },
    search.listBacklinksHandler as any,
  );

  server.registerTool(
    "list_children",
    {
      title: "List Document Children",
      description: "List the direct children of a document in the sidebar.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
      },
    },
    search.listChildrenHandler as any,
  );

  // Tags
  server.registerTool(
    "list_tags",
    {
      title: "List Tags",
      description: "List all tags in a workspace.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
      },
    },
    tags.listTagsHandler as any,
  );

  server.registerTool(
    "list_docs_by_tag",
    {
      title: "List Documents By Tag",
      description: "List documents that contain the requested tag.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        tag: z.string().min(1),
        ignoreCase: z.boolean().optional(),
      },
    },
    tags.listDocsByTagHandler as any,
  );

  server.registerTool(
    "create_tag",
    {
      title: "Create Tag",
      description: "Create a workspace-level tag entry.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        tag: z.string().min(1),
      },
    },
    tags.createTagHandler as any,
  );

  server.registerTool(
    "add_tag_to_doc",
    {
      title: "Add Tag To Document",
      description: "Add a tag to a document.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        tag: z.string().min(1),
      },
    },
    tags.addTagToDocHandler as any,
  );

  server.registerTool(
    "remove_tag_from_doc",
    {
      title: "Remove Tag From Document",
      description: "Remove a tag from a document.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        tag: z.string().min(1),
      },
    },
    tags.removeTagFromDocHandler as any,
  );

  server.registerTool(
    "get_docs_by_tag",
    {
      title: "Get Documents by Tag",
      description: "Filter documents by tag name.",
      inputSchema: {
        workspaceId: z.string().optional(),
        tag: z.string(),
      },
    },
    tags.getDocsByTagHandler as any,
  );

  // Blocks
  server.registerTool(
    "append_paragraph",
    {
      title: "Append Paragraph",
      description: "Append a text paragraph block to a document.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        text: z.string(),
      },
    },
    blocks.appendParagraphHandler as any,
  );

  server.registerTool(
    "append_block",
    {
      title: "Append Block",
      description: "Append document blocks with canonical types.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        type: z.string().min(1),
        text: z.string().optional(),
        url: z.string().optional(),
        pageId: z.string().optional(),
        iframeUrl: z.string().optional(),
        html: z.string().optional(),
        design: z.string().optional(),
        reference: z.string().optional(),
        refFlavour: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        background: z.string().optional(),
        sourceId: z.string().optional(),
        name: z.string().optional(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
        embed: z.boolean().optional(),
        rows: z.number().optional(),
        columns: z.number().optional(),
        latex: z.string().optional(),
        level: z.number().optional(),
        style: AppendBlockListStyle.optional(),
        bookmarkStyle: AppendBlockBookmarkStyle.optional(),
        viewMode: AppendBlockDataViewMode.optional(),
        checked: z.boolean().optional(),
        language: z.string().optional(),
        caption: z.string().optional(),
        strict: z.boolean().optional(),
        placement: z
          .object({
            parentId: z.string().optional(),
            afterBlockId: z.string().optional(),
            beforeBlockId: z.string().optional(),
            index: z.number().optional(),
          })
          .optional(),
      },
    },
    blocks.appendBlockHandler as any,
  );

  server.registerTool(
    "move_doc",
    {
      title: "Move Document in Sidebar",
      description:
        "Move a doc in the sidebar by embedding it under a new parent.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        toParentDocId: z.string(),
        fromParentDocId: z.string().optional(),
      },
    },
    blocks.moveDocHandler as any,
  );

  server.registerTool(
    "cleanup_orphan_embeds",
    {
      title: "Cleanup Orphan Embed Links",
      description: "Remove embed_linked_doc blocks that point to deleted docs.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        dryRun: z.boolean().optional(),
      },
    },
    blocks.cleanupOrphanEmbedsHandler as any,
  );

  server.registerTool(
    "find_and_replace",
    {
      title: "Find and Replace in Document",
      description:
        "Find and replace text across all Y.Text fields in a document.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        search: z.string().min(1),
        replace: z.string(),
        matchAll: z.boolean().optional(),
        dryRun: z.boolean().optional(),
      },
    },
    blocks.findAndReplaceHandler as any,
  );

  // Markdown
  server.registerTool(
    "export_doc_markdown",
    {
      title: "Export Document Markdown",
      description: "Export AFFiNE document content to markdown.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        includeFrontmatter: z.boolean().optional(),
      },
    },
    markdown.exportDocMarkdownHandler as any,
  );

  server.registerTool(
    "create_doc_from_markdown",
    {
      title: "Create Document From Markdown",
      description: "Create a new AFFiNE document and import markdown content.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        title: z.string().optional(),
        markdown: MarkdownContent,
        strict: z.boolean().optional(),
        parentDocId: z.string().optional(),
      },
    },
    markdown.createDocFromMarkdownHandler as any,
  );

  server.registerTool(
    "batch_create_docs",
    {
      title: "Batch Create Documents",
      description: "Create multiple AFFiNE documents in a single call.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docs: z
          .array(
            z.object({
              title: z.string(),
              markdown: z.string(),
              parentDocId: z.string().optional(),
            }),
          )
          .min(1)
          .max(20),
      },
    },
    markdown.batchCreateDocsHandler as any,
  );

  server.registerTool(
    "append_markdown",
    {
      title: "Append Markdown",
      description: "Append markdown content to an existing AFFiNE document.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        markdown: MarkdownContent,
        strict: z.boolean().optional(),
        placement: z
          .object({
            parentId: z.string().optional(),
            afterBlockId: z.string().optional(),
            beforeBlockId: z.string().optional(),
            index: z.number().optional(),
          })
          .optional(),
      },
    },
    markdown.appendMarkdownHandler as any,
  );

  server.registerTool(
    "replace_doc_with_markdown",
    {
      title: "Replace Document With Markdown",
      description:
        "Replace the main note content of a document with markdown content.",
      inputSchema: {
        workspaceId: WorkspaceId.optional(),
        docId: DocId,
        markdown: MarkdownContent,
        strict: z.boolean().optional(),
      },
    },
    markdown.replaceDocWithMarkdownHandler as any,
  );

  // Database
  server.registerTool(
    "add_database_row",
    {
      title: "Add Database Row",
      description: "Add a row to an AFFiNE database block.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        cells: z.record(z.string(), z.unknown()),
        linkedDocId: z.string().optional(),
      },
    },
    database.addDatabaseRowHandler as any,
  );

  server.registerTool(
    "delete_database_row",
    {
      title: "Delete Database Row",
      description: "Delete a row from an AFFiNE database block.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        rowBlockId: z.string().min(1),
      },
    },
    database.deleteDatabaseRowHandler as any,
  );

  server.registerTool(
    "read_database_cells",
    {
      title: "Read Database Cells",
      description:
        "Read row titles and database cell values from an AFFiNE database block.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        rowBlockIds: z.array(z.string().min(1)).optional(),
        columns: z.array(z.string().min(1)).optional(),
      },
    },
    database.readDatabaseCellsHandler as any,
  );

  server.registerTool(
    "read_database_columns",
    {
      title: "Read Database Columns",
      description: "Read schema metadata for an AFFiNE database block.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
      },
    },
    database.readDatabaseColumnsHandler as any,
  );

  server.registerTool(
    "update_database_cell",
    {
      title: "Update Database Cell",
      description: "Update a single cell on an existing AFFiNE database row.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        rowBlockId: z.string().min(1),
        column: z.string().min(1),
        value: z.unknown(),
        createOption: z.boolean().optional(),
        linkedDocId: z.string().optional(),
      },
    },
    database.updateDatabaseCellHandler as any,
  );

  server.registerTool(
    "update_database_row",
    {
      title: "Update Database Row",
      description:
        "Batch update multiple cells on an existing AFFiNE database row.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        rowBlockId: z.string().min(1),
        cells: z.record(z.string(), z.unknown()),
        createOption: z.boolean().optional(),
        linkedDocId: z.string().optional(),
      },
    },
    database.updateDatabaseRowHandler as any,
  );

  server.registerTool(
    "add_database_column",
    {
      title: "Add Database Column",
      description: "Add a column to an existing AFFiNE database block.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: DocId,
        databaseBlockId: z.string().min(1),
        name: z.string().min(1),
        type: z
          .enum([
            "rich-text",
            "select",
            "multi-select",
            "number",
            "checkbox",
            "link",
            "date",
          ])
          .default("rich-text"),
        options: z.array(z.string()).optional(),
        width: z.number().optional(),
      },
    },
    database.addDatabaseColumnHandler as any,
  );

  // Publishing
  server.registerTool(
    "publish_doc",
    {
      title: "Publish Document",
      description: "Publish a doc (make public).",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
        mode: z.enum(["Page", "Edgeless"]).optional(),
      },
    },
    publish.publishDocHandler as any,
  );

  server.registerTool(
    "revoke_doc",
    {
      title: "Revoke Document",
      description: "Revoke a doc's public access.",
      inputSchema: {
        workspaceId: z.string().optional(),
        docId: z.string(),
      },
    },
    publish.revokeDocHandler as any,
  );
}
