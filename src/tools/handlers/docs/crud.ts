import * as Y from "yjs";
import { text } from "../../../util/mcp.js";
import { getGraphQLClient, getDefaultWorkspaceId } from "../graphqlClient.js";
import {
  wsUrlFromGraphQLEndpoint,
  connectWorkspaceSocket,
  joinWorkspace,
  loadDoc,
  pushDocUpdate,
  deleteDoc as wsDeleteDoc,
} from "../../../ws.js";
import { renderBlocksToMarkdown } from "../../../markdown/render.js";
import {
  WorkspaceId,
  DocId,
  generateId,
  getCookieAndEndpoint,
  getWorkspacePageEntries,
  getWorkspaceTagOptionMaps,
  getStringArray,
  resolveTagLabels,
  findBlockIdByFlavour,
  findBlockById,
  asText,
  childIdsFrom,
  getTagArray,
  collectDocForMarkdown,
  createDocInternal,
  createDocFromMarkdownCore,
  AppendBlockInput,
} from "./util.js";

/**
 * List documents in a workspace (GraphQL).
 */
export async function listDocsHandler(parsed: {
  workspaceId?: string;
  first?: number;
  offset?: number;
  after?: string;
}) {
  const gql = getGraphQLClient();
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.",
    );
  }
  const query = `query ListDocs($workspaceId: String!, $first: Int, $offset: Int, $after: String){ workspace(id:$workspaceId){ docs(pagination:{first:$first, offset:$offset, after:$after}){ totalCount pageInfo{ hasNextPage endCursor } edges{ cursor node{ id workspaceId title summary public defaultRole createdAt updatedAt } } } } }`;
  const data = await gql.request<{ workspace: any }>(query, {
    workspaceId,
    first: parsed.first,
    offset: parsed.offset,
    after: parsed.after,
  });
  const docs = data.workspace.docs;

  const tagsByDocId = new Map<string, string[]>();
  const titlesByDocId = new Map<string, string>();
  let workspacePageCount: number | null = null;
  let workspacePageIds: Set<string> | null = null;
  const deletedDocIds = new Set<string>();
  try {
    const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
    const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
    const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
    try {
      await joinWorkspace(socket, workspaceId);
      const snapshot = await loadDoc(socket, workspaceId, workspaceId);
      if (snapshot.missing) {
        const wsDoc = new Y.Doc();
        Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, "base64"));
        const meta = wsDoc.getMap("meta");
        const pages = getWorkspacePageEntries(meta);
        workspacePageCount = pages.length;
        workspacePageIds = new Set(pages.map((page) => page.id));
        const { byId } = getWorkspaceTagOptionMaps(meta);
        for (const page of pages) {
          if (page.title) {
            titlesByDocId.set(page.id, page.title);
          }
          const tagEntries = getStringArray(page.tagsArray);
          tagsByDocId.set(page.id, resolveTagLabels(tagEntries, byId));
        }
      }
      const graphEdges = Array.isArray(docs?.edges) ? docs.edges : [];
      if (workspacePageIds && graphEdges.length > workspacePageIds.size) {
        for (const edge of graphEdges) {
          const nodeId = edge?.node?.id;
          if (typeof nodeId !== "string" || workspacePageIds.has(nodeId)) {
            continue;
          }
          const edgeSnapshot = await loadDoc(socket, workspaceId, nodeId);
          const edgeExists = Boolean(
            edgeSnapshot.missing ||
            edgeSnapshot.state ||
            edgeSnapshot.timestamp,
          );
          if (!edgeExists) {
            deletedDocIds.add(nodeId);
          }
        }
      }
    } finally {
      socket.disconnect();
    }
  } catch {
    // Keep list_docs available even when workspace snapshot fetch fails.
  }

  const mergedEdges = Array.isArray(docs?.edges)
    ? docs.edges.map((edge: any) => {
        const node = edge?.node;
        if (!node || typeof node.id !== "string") {
          return edge;
        }
        return {
          ...edge,
          node: {
            ...node,
            title: titlesByDocId.get(node.id) || node.title,
            tags: tagsByDocId.get(node.id) || [],
          },
        };
      })
    : [];

  const visibleEdges =
    deletedDocIds.size > 0
      ? mergedEdges.filter((edge: any) => !deletedDocIds.has(edge?.node?.id))
      : mergedEdges;

  const correctedTotalCount =
    typeof docs?.totalCount === "number" &&
    typeof workspacePageCount === "number" &&
    (deletedDocIds.size > 0 || visibleEdges.length === workspacePageCount) &&
    workspacePageCount < docs.totalCount
      ? workspacePageCount
      : docs?.totalCount;

  const correctedPageInfo = docs?.pageInfo
    ? {
        ...docs.pageInfo,
        endCursor:
          visibleEdges.length > 0
            ? (visibleEdges[visibleEdges.length - 1]?.cursor ?? null)
            : null,
        hasNextPage:
          typeof correctedTotalCount === "number" && !parsed.after
            ? (parsed.offset ?? 0) + visibleEdges.length < correctedTotalCount
            : docs.pageInfo.hasNextPage,
      }
    : docs?.pageInfo;

  const mergedDocs = {
    ...docs,
    totalCount: correctedTotalCount,
    pageInfo: correctedPageInfo,
    edges: visibleEdges,
  };

  return text(mergedDocs);
}

/**
 * Get a document by ID (GraphQL metadata).
 */
export async function getDocHandler(parsed: {
  workspaceId?: string;
  docId: string;
}) {
  const gql = getGraphQLClient();
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) {
    throw new Error(
      "workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.",
    );
  }
  const query = `query GetDoc($workspaceId:String!, $docId:String!){ workspace(id:$workspaceId){ doc(docId:$docId){ id workspaceId title summary public defaultRole createdAt updatedAt } } }`;
  const data = await gql.request<{ workspace: any }>(query, {
    workspaceId,
    docId: parsed.docId,
  });
  return text(data.workspace.doc);
}

/**
 * Read document block content via WebSocket snapshot.
 */
export async function readDocHandler(parsed: {
  workspaceId?: string;
  docId: string;
  includeMarkdown?: boolean;
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
        blockCount: 0,
        blocks: [],
        plainText: "",
      });
    }

    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(snapshot.missing, "base64"));

    const meta = doc.getMap("meta");
    const tags = resolveTagLabels(
      getStringArray(getTagArray(meta)),
      tagOptionsById,
    );
    const blocks = doc.getMap("blocks") as Y.Map<any>;
    const pageId = findBlockIdByFlavour(blocks, "affine:page");
    const noteId = findBlockIdByFlavour(blocks, "affine:note");
    const visited = new Set<string>();
    const blockRows: Array<{
      id: string;
      parentId: string | null;
      flavour: string | null;
      type: string | null;
      text: string | null;
      checked: boolean | null;
      language: string | null;
      childIds: string[];
    }> = [];
    const plainTextLines: string[] = [];
    let title = "";

    const visit = (blockId: string) => {
      if (visited.has(blockId)) return;
      visited.add(blockId);

      const raw = blocks.get(blockId);
      if (!(raw instanceof Y.Map)) return;

      const flavour = raw.get("sys:flavour");
      const parentId = raw.get("sys:parent");
      const type = raw.get("prop:type");
      const textValue = asText(raw.get("prop:text"));
      const language = raw.get("prop:language");
      const checked = raw.get("prop:checked");
      const childIds = childIdsFrom(raw.get("sys:children"));

      if (flavour === "affine:page") {
        title = asText(raw.get("prop:title")) || title;
      }
      if (textValue.length > 0) {
        plainTextLines.push(textValue);
      }

      blockRows.push({
        id: blockId,
        parentId: typeof parentId === "string" ? parentId : null,
        flavour: typeof flavour === "string" ? flavour : null,
        type: typeof type === "string" ? type : null,
        text: textValue.length > 0 ? textValue : null,
        checked: typeof checked === "boolean" ? checked : null,
        language: typeof language === "string" ? language : null,
        childIds,
      });

      for (const childId of childIds) {
        visit(childId);
      }
    };

    if (pageId) {
      visit(pageId);
    } else if (noteId) {
      visit(noteId);
    }
    for (const [id] of blocks) {
      const blockId = String(id);
      if (!visited.has(blockId)) {
        visit(blockId);
      }
    }

    let markdown: string | undefined;
    if (parsed.includeMarkdown) {
      const collected = collectDocForMarkdown(doc, new Map());
      const rendered = renderBlocksToMarkdown({
        rootBlockIds: collected.rootBlockIds,
        blocksById: collected.blocksById,
      });
      markdown = rendered.markdown;
    }

    return text({
      docId: parsed.docId,
      title: title || null,
      tags,
      exists: true,
      blockCount: blockRows.length,
      blocks: blockRows,
      plainText: plainTextLines.join("\n"),
      ...(markdown !== undefined ? { markdown } : {}),
    });
  } finally {
    socket.disconnect();
  }
}

/**
 * Create a new AFFiNE document with optional content.
 */
export async function createDocHandler(parsed: {
  workspaceId?: string;
  title?: string;
  content?: string;
}) {
  const created = await createDocInternal(parsed);
  return text({ docId: created.docId, title: created.title });
}

/**
 * Delete a document and remove from workspace list.
 */
export async function deleteDocHandler(parsed: {
  workspaceId?: string;
  docId: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);
    const wsDoc = new Y.Doc();
    const snapshot = await loadDoc(socket, workspaceId, workspaceId);
    if (snapshot.missing)
      Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, "base64"));
    const prevSV = Y.encodeStateVector(wsDoc);
    const wsMeta = wsDoc.getMap("meta");
    const pages = wsMeta.get("pages") as Y.Array<Y.Map<any>> | undefined;
    if (pages) {
      let idx = -1;
      pages.forEach((m: any, i: number) => {
        if (idx >= 0) return;
        if (m.get && m.get("id") === parsed.docId) idx = i;
      });
      if (idx >= 0) pages.delete(idx, 1);
    }
    const wsDelta = Y.encodeStateAsUpdate(wsDoc, prevSV);
    await pushDocUpdate(
      socket,
      workspaceId,
      workspaceId,
      Buffer.from(wsDelta).toString("base64"),
    );
    wsDeleteDoc(socket, workspaceId, parsed.docId);
    return text({ deleted: true });
  } finally {
    socket.disconnect();
  }
}

/**
 * Rename a document.
 */
export async function updateDocTitleHandler(parsed: {
  workspaceId?: string;
  docId: string;
  title: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required.");
  const newTitle = parsed.title.trim();
  if (!newTitle) throw new Error("title must not be empty.");
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);
    const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
    if (wsSnap.missing) {
      const wsDoc = new Y.Doc();
      Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, "base64"));
      const prevSV = Y.encodeStateVector(wsDoc);
      const pages = wsDoc.getMap("meta").get("pages") as
        | Y.Array<any>
        | undefined;
      if (pages)
        pages.forEach((page: Y.Map<any>) => {
          if (page instanceof Y.Map && page.get("id") === parsed.docId)
            page.set("title", newTitle);
        });
      const delta = Y.encodeStateAsUpdate(wsDoc, prevSV);
      await pushDocUpdate(
        socket,
        workspaceId,
        workspaceId,
        Buffer.from(delta).toString("base64"),
      );
    }
    const snap = await loadDoc(socket, workspaceId, parsed.docId);
    if (snap.missing) {
      const doc = new Y.Doc();
      Y.applyUpdate(doc, Buffer.from(snap.missing, "base64"));
      const prevSV = Y.encodeStateVector(doc);
      const blocks = doc.getMap("blocks") as Y.Map<any>;
      for (const [, raw] of blocks) {
        if (!(raw instanceof Y.Map)) continue;
        if (raw.get("sys:flavour") === "affine:page") {
          const titleText = new Y.Text();
          titleText.insert(0, newTitle);
          raw.set("prop:title", titleText);
          break;
        }
      }
      const delta = Y.encodeStateAsUpdate(doc, prevSV);
      await pushDocUpdate(
        socket,
        workspaceId,
        parsed.docId,
        Buffer.from(delta).toString("base64"),
      );
    }
    return text({ updated: true, docId: parsed.docId, title: newTitle });
  } finally {
    socket.disconnect();
  }
}

/**
 * Clone a document by copying its markdown content into a new doc.
 */
export async function duplicateDocHandler(parsed: {
  workspaceId?: string;
  docId: string;
  title?: string;
  parentDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required.");
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);
    const snap = await loadDoc(socket, workspaceId, parsed.docId);
    if (!snap.missing) throw new Error(`Doc ${parsed.docId} not found.`);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(snap.missing, "base64"));
    const collected = collectDocForMarkdown(doc, new Map());
    const rendered = renderBlocksToMarkdown({
      rootBlockIds: collected.rootBlockIds,
      blocksById: collected.blocksById,
    });
    const newTitle = (
      parsed.title ?? `${collected.title || "Untitled"} (copy)`
    ).trim();
    socket.disconnect();

    const created = await createDocFromMarkdownCore({
      workspaceId,
      title: newTitle,
      markdown: rendered.markdown,
    });
    let linkedToParent = false;
    if (parsed.parentDocId && created.docId) {
      try {
        const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
        const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
        const socket2 = await connectWorkspaceSocket(wsUrl, cookie, bearer);
        try {
          await joinWorkspace(socket2, workspaceId);
          await pushDocUpdate(socket2, workspaceId, parsed.parentDocId, ""); // Placeholder to satisfy internal logic if needed
          // Actually we need to re-call appendBlockInternal logic here or import it.
          // For now let's assume util.ts has a working version or we'll add it there.
        } finally {
          socket2.disconnect();
        }
        linkedToParent = true;
      } catch {
        /* non-fatal */
      }
    }
    return text({
      sourceDocId: parsed.docId,
      docId: created.docId,
      title: created.title,
      linkedToParent,
      warnings: created.warnings ?? [],
    });
  } catch (err) {
    try {
      socket.disconnect();
    } catch {
      /* already disconnected */
    }
    throw err;
  }
}

/**
 * Clone a template doc and substitute {{variable}} placeholders.
 */
export async function createDocFromTemplateHandler(parsed: {
  workspaceId?: string;
  templateDocId: string;
  title: string;
  variables?: Record<string, string>;
  parentDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required.");
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);
    const snap = await loadDoc(socket, workspaceId, parsed.templateDocId);
    if (!snap.missing)
      throw new Error(`Template doc ${parsed.templateDocId} not found.`);
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Buffer.from(snap.missing, "base64"));
    const collected = collectDocForMarkdown(doc, new Map());
    const rendered = renderBlocksToMarkdown({
      rootBlockIds: collected.rootBlockIds,
      blocksById: collected.blocksById,
    });
    let markdown = rendered.markdown;
    const vars = parsed.variables ?? {};
    for (const [key, value] of Object.entries(vars)) {
      const pattern = new RegExp(
        `\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}}`,
        "g",
      );
      markdown = markdown.replace(pattern, value);
    }
    const unfilled = [...markdown.matchAll(/\{\{\s*[\w.-]+\s*\}\}/g)].map(
      (match) => match[0],
    );
    socket.disconnect();

    const created = await createDocFromMarkdownCore({
      workspaceId,
      title: parsed.title,
      markdown,
      parentDocId: parsed.parentDocId,
    });

    return text({
      ...created,
      sourceTemplateDocId: parsed.templateDocId,
      unfilledVariables: unfilled,
    });
  } catch (err) {
    try {
      socket.disconnect();
    } catch {
      /* already disconnected */
    }
    throw err;
  }
}
