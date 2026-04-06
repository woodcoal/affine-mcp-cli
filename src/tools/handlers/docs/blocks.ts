import * as Y from "yjs";
import { text, getDefaultWorkspaceId } from "../utils.js";
import {
  wsUrlFromGraphQLEndpoint,
  connectWorkspaceSocket,
  joinWorkspace,
  loadDoc,
  pushDocUpdate,
} from "../../../ws.js";
import {
  getCookieAndEndpoint,
  appendBlockInternal,
  AppendBlockListStyle,
  AppendBlockBookmarkStyle,
  AppendBlockDataViewMode,
  AppendPlacement,
  childIdsFrom,
} from "./util.js";

/**
 * Append a text paragraph block to a document.
 */
export async function appendParagraphHandler(parsed: {
  workspaceId?: string;
  docId: string;
  text: string;
}) {
  const result = await appendBlockInternal({
    workspaceId: parsed.workspaceId,
    docId: parsed.docId,
    type: "paragraph",
    text: parsed.text,
  });
  return text({ appended: result.appended, paragraphId: result.blockId });
}

/**
 * Append document blocks with canonical types and legacy aliases.
 */
export async function appendBlockHandler(parsed: {
  workspaceId?: string;
  docId: string;
  type: string;
  text?: string;
  url?: string;
  pageId?: string;
  iframeUrl?: string;
  html?: string;
  design?: string;
  reference?: string;
  refFlavour?: string;
  width?: number;
  height?: number;
  background?: string;
  sourceId?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  embed?: boolean;
  rows?: number;
  columns?: number;
  latex?: string;
  checked?: boolean;
  language?: string;
  caption?: string;
  level?: number;
  style?: AppendBlockListStyle;
  bookmarkStyle?: AppendBlockBookmarkStyle;
  viewMode?: AppendBlockDataViewMode;
  strict?: boolean;
  placement?: AppendPlacement;
}) {
  const result = await appendBlockInternal(parsed);
  return text({
    appended: result.appended,
    blockId: result.blockId,
    flavour: result.flavour,
    type: result.blockType || null,
    normalizedType: result.normalizedType,
    legacyType: result.legacyType,
  });
}

/**
 * Move a doc in the sidebar by embedding it under a new parent.
 */
export async function moveDocHandler(parsed: {
  workspaceId?: string;
  docId: string;
  toParentDocId: string;
  fromParentDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required.");

  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);

  try {
    await joinWorkspace(socket, workspaceId);

    let removedFromParent = false;

    if (parsed.fromParentDocId) {
      const parentDoc = new Y.Doc();
      const parentSnapshot = await loadDoc(
        socket,
        workspaceId,
        parsed.fromParentDocId,
      );
      if (parentSnapshot.missing) {
        Y.applyUpdate(parentDoc, Buffer.from(parentSnapshot.missing, "base64"));
        const prevSV = Y.encodeStateVector(parentDoc);
        const blocks = parentDoc.getMap("blocks") as Y.Map<any>;

        let embedBlockId: string | null = null;
        let embedParentChildren: Y.Array<any> | null = null;
        let embedIndex = -1;

        for (const [id, raw] of blocks) {
          if (!(raw instanceof Y.Map)) continue;
          const flavour = raw.get("sys:flavour");
          const pageId = raw.get("prop:pageId");
          if (
            flavour === "affine:embed-linked-doc" &&
            pageId === parsed.docId
          ) {
            embedBlockId = String(id);
            break;
          }
        }

        if (embedBlockId) {
          for (const [, raw] of blocks) {
            if (!(raw instanceof Y.Map)) continue;
            const children = raw.get("sys:children");
            if (!(children instanceof Y.Array)) continue;
            const arr = children.toArray() as string[];
            const idx = arr.indexOf(embedBlockId);
            if (idx >= 0) {
              embedParentChildren = children;
              embedIndex = idx;
              break;
            }
          }
          if (embedParentChildren && embedIndex >= 0) {
            embedParentChildren.delete(embedIndex, 1);
          }
          blocks.delete(embedBlockId);
          const delta = Y.encodeStateAsUpdate(parentDoc, prevSV);
          await pushDocUpdate(
            socket,
            workspaceId,
            parsed.fromParentDocId,
            Buffer.from(delta).toString("base64"),
          );
          removedFromParent = true;
        }
      }
    }

    await appendBlockInternal({
      workspaceId,
      docId: parsed.toParentDocId,
      type: "embed_linked_doc",
      pageId: parsed.docId,
    });

    return text({
      moved: true,
      docId: parsed.docId,
      toParentDocId: parsed.toParentDocId,
      removedFromParent,
    });
  } finally {
    socket.disconnect();
  }
}

/**
 * Remove embed_linked_doc blocks that point to deleted/non-existent docs.
 */
export async function cleanupOrphanEmbedsHandler(parsed: {
  workspaceId?: string;
  docId: string;
  dryRun?: boolean;
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
    const blocks = doc.getMap("blocks") as Y.Map<any>;
    const orphans: Array<{ blockId: string; targetDocId: string }> = [];
    for (const [blockId, raw] of blocks) {
      if (!(raw instanceof Y.Map)) continue;
      if (raw.get("sys:flavour") !== "affine:embed-linked-doc") continue;
      const targetId = raw.get("prop:pageId");
      if (typeof targetId !== "string" || !targetId) {
        orphans.push({ blockId, targetDocId: targetId ?? "" });
        continue;
      }
      const targetSnap = await loadDoc(socket, workspaceId, targetId);
      if (!targetSnap.missing) orphans.push({ blockId, targetDocId: targetId });
    }
    if (parsed.dryRun || orphans.length === 0) {
      return text({
        docId: parsed.docId,
        dryRun: parsed.dryRun ?? false,
        orphansFound: orphans.length,
        orphans,
      });
    }
    const prevSV = Y.encodeStateVector(doc);
    for (const { blockId } of orphans) {
      for (const [, parentRaw] of blocks) {
        if (!(parentRaw instanceof Y.Map)) continue;
        const children = parentRaw.get("sys:children");
        if (!(children instanceof Y.Array)) continue;
        const ids = childIdsFrom(children);
        const idx = ids.indexOf(blockId);
        if (idx !== -1) {
          children.delete(idx, 1);
          break;
        }
      }
      blocks.delete(blockId);
    }
    const delta = Y.encodeStateAsUpdate(doc, prevSV);
    await pushDocUpdate(
      socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );
    return text({
      docId: parsed.docId,
      dryRun: false,
      orphansRemoved: orphans.length,
      orphans,
    });
  } finally {
    socket.disconnect();
  }
}

/**
 * Find and replace text across all Y.Text fields in a document.
 */
export async function findAndReplaceHandler(parsed: {
  workspaceId?: string;
  docId: string;
  search: string;
  replace: string;
  matchAll?: boolean;
  dryRun?: boolean;
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
    const blocks = doc.getMap("blocks") as Y.Map<any>;
    let totalMatches = 0;
    const matchLog: Array<{
      blockId: string;
      flavour: string;
      original: string;
      replaced: string;
    }> = [];
    const matchAll = parsed.matchAll !== false;
    for (const [blockId, raw] of blocks) {
      if (!(raw instanceof Y.Map)) continue;
      const flavour = raw.get("sys:flavour") as string | undefined;
      for (const [, val] of raw) {
        if (!(val instanceof Y.Text)) continue;
        const original = val.toString();
        if (!original.includes(parsed.search)) continue;
        const replaced = matchAll
          ? original.split(parsed.search).join(parsed.replace)
          : original.replace(parsed.search, parsed.replace);
        const count = matchAll ? original.split(parsed.search).length - 1 : 1;
        totalMatches += count;
        matchLog.push({
          blockId,
          flavour: flavour ?? "unknown",
          original,
          replaced,
        });
        if (!parsed.dryRun) {
          const prevSV = Y.encodeStateVector(doc);
          val.delete(0, val.length);
          val.insert(0, replaced);
          const delta = Y.encodeStateAsUpdate(doc, prevSV);
          await pushDocUpdate(
            socket,
            workspaceId,
            parsed.docId,
            Buffer.from(delta).toString("base64"),
          );
        }
      }
    }
    return text({
      docId: parsed.docId,
      search: parsed.search,
      replace: parsed.replace,
      dryRun: parsed.dryRun ?? false,
      totalMatches,
      blocksAffected: matchLog.length,
      matches: matchLog,
    });
  } finally {
    socket.disconnect();
  }
}
