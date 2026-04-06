import * as Y from "yjs";
import { text } from "../../../util/mcp.js";
import { getGraphQLClient, getDefaultWorkspaceId } from "../graphqlClient.js";
import {
  wsUrlFromGraphQLEndpoint,
  connectWorkspaceSocket,
  joinWorkspace,
  loadDoc,
  pushDocUpdate,
} from "../../../ws.js";
import { parseMarkdownToOperations } from "../../../markdown/parse.js";
import { renderBlocksToMarkdown } from "../../../markdown/render.js";
import {
  WorkspaceId,
  DocId,
  MarkdownContent,
  getCookieAndEndpoint,
  getWorkspaceTagOptionMaps,
  collectDocForMarkdown,
  createDocFromMarkdownCore,
  applyMarkdownOperationsInternal,
  AppendPlacement,
  mergeWarnings,
} from "./util.js";

/**
 * Export AFFiNE document content to markdown.
 */
export async function exportDocMarkdownHandler(parsed: {
  workspaceId?: string;
  docId: string;
  includeFrontmatter?: boolean;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.",
    );
  }

  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);

  try {
    await joinWorkspace(socket, workspaceId);
    let tagOptionsById = new Map<string, any>();
    const workspaceSnapshot = await loadDoc(socket, workspaceId, workspaceId);
    if (workspaceSnapshot.missing) {
      const workspaceDoc = new Y.Doc();
      Y.applyUpdate(
        workspaceDoc,
        Buffer.from(workspaceSnapshot.missing, "base64"),
      );
      tagOptionsById = getWorkspaceTagOptionMaps(
        workspaceDoc.getMap("meta"),
      ).byId;
    }

    const snapshot = await loadDoc(socket, workspaceId, parsed.docId);
    if (!snapshot.missing) {
      return text({
        docId: parsed.docId,
        title: null,
        tags: [],
        exists: false,
        markdown: "",
        warnings: [
          `Document ${parsed.docId} was not found in workspace ${workspaceId}.`,
        ],
        lossy: false,
        stats: {
          blockCount: 0,
          unsupportedCount: 0,
        },
      });
    }

    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(snapshot.missing, "base64"));
    const collected = collectDocForMarkdown(doc, tagOptionsById);
    const rendered = renderBlocksToMarkdown({
      rootBlockIds: collected.rootBlockIds,
      blocksById: collected.blocksById,
    });

    let markdown = rendered.markdown;
    if (parsed.includeFrontmatter) {
      const escapedTitle = (collected.title || "Untitled").replace(
        /\"/g,
        '\\"',
      );
      const frontmatterLines = [
        "---",
        `docId: \"${parsed.docId}\"`,
        `title: \"${escapedTitle}\"`,
        "tags:",
        ...(collected.tags.length > 0
          ? collected.tags.map((tag) => `  - \"${tag.replace(/\"/g, '\\"')}\"`)
          : ["  -"]),
        `lossy: ${rendered.lossy ? "true" : "false"}`,
        "---",
      ];
      markdown = `${frontmatterLines.join("\n")}\n\n${markdown}`;
    }

    return text({
      docId: parsed.docId,
      title: collected.title || null,
      tags: collected.tags,
      exists: true,
      markdown,
      warnings: rendered.warnings,
      lossy: rendered.lossy,
      stats: rendered.stats,
    });
  } finally {
    socket.disconnect();
  }
}

/**
 * Create a new AFFiNE document and import markdown content.
 */
export async function createDocFromMarkdownHandler(parsed: {
  workspaceId?: string;
  title?: string;
  markdown: string;
  strict?: boolean;
}) {
  return text(await createDocFromMarkdownCore(parsed));
}

/**
 * Create multiple AFFiNE documents in a single call.
 */
export async function batchCreateDocsHandler(parsed: {
  workspaceId?: string;
  docs: Array<{ title: string; markdown: string; parentDocId?: string }>;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required.");
  if (!Array.isArray(parsed.docs) || parsed.docs.length === 0)
    throw new Error("docs array is required.");
  if (parsed.docs.length > 20) throw new Error("Maximum 20 docs per batch.");

  const results: Array<{
    title: string;
    docId: string;
    linkedToParent: boolean;
    warnings: string[];
  }> = [];

  for (const item of parsed.docs) {
    try {
      const d = await createDocFromMarkdownCore({
        workspaceId,
        title: item.title,
        markdown: item.markdown,
        parentDocId: item.parentDocId,
      });
      results.push({
        title: d.title,
        docId: d.docId,
        linkedToParent: d.linkedToParent,
        warnings: d.warnings ?? [],
      });
    } catch (err: any) {
      results.push({
        title: item.title,
        docId: "",
        linkedToParent: false,
        warnings: [`Failed: ${err?.message ?? String(err)}`],
      });
    }
  }

  const failed = results.filter((r) => !r.docId).length;
  return text({ created: results.length - failed, failed, results });
}

/**
 * Append markdown content to an existing AFFiNE document.
 */
export async function appendMarkdownHandler(parsed: {
  workspaceId?: string;
  docId: string;
  markdown: string;
  strict?: boolean;
  placement?: AppendPlacement;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.",
    );
  }

  const parsedMarkdown = parseMarkdownToOperations(parsed.markdown);
  const applied = await applyMarkdownOperationsInternal({
    workspaceId,
    docId: parsed.docId,
    operations: parsedMarkdown.operations,
    strict: parsed.strict,
    placement: parsed.placement,
  });

  const applyWarnings =
    applied.skippedCount > 0
      ? [
          `${applied.skippedCount} markdown block(s) could not be applied to AFFiNE and were skipped.`,
        ]
      : [];

  return text({
    workspaceId,
    docId: parsed.docId,
    appended: applied.appendedCount > 0,
    appendedCount: applied.appendedCount,
    blockIds: applied.blockIds,
    warnings: mergeWarnings(parsedMarkdown.warnings, applyWarnings),
    lossy: parsedMarkdown.lossy || applied.skippedCount > 0,
    stats: {
      parsedBlocks: parsedMarkdown.operations.length,
      appliedBlocks: applied.appendedCount,
      skippedBlocks: applied.skippedCount,
    },
  });
}

/**
 * Replace the main note content of a document with markdown content.
 */
export async function replaceDocWithMarkdownHandler(parsed: {
  workspaceId?: string;
  docId: string;
  markdown: string;
  strict?: boolean;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.",
    );
  }

  const parsedMarkdown = parseMarkdownToOperations(parsed.markdown);
  const applied = await applyMarkdownOperationsInternal({
    workspaceId,
    docId: parsed.docId,
    operations: parsedMarkdown.operations,
    strict: parsed.strict,
    replaceExisting: true,
  });

  const applyWarnings =
    applied.skippedCount > 0
      ? [
          `${applied.skippedCount} markdown block(s) could not be applied to AFFiNE and were skipped.`,
        ]
      : [];

  return text({
    workspaceId,
    docId: parsed.docId,
    replaced: true,
    warnings: mergeWarnings(parsedMarkdown.warnings, applyWarnings),
    lossy: parsedMarkdown.lossy || applied.skippedCount > 0,
    stats: {
      parsedBlocks: parsedMarkdown.operations.length,
      appliedBlocks: applied.appendedCount,
      skippedBlocks: applied.skippedCount,
    },
  });
}
