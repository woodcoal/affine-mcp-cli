import * as Y from "yjs";
import { text, getDefaultWorkspaceId } from "../utils.js";
import { pushDocUpdate } from "../../../ws.js";
import {
  generateId,
  setSysFields,
  makeLinkedDocText,
  resolveDatabaseTitleValue,
  makeText,
  ensureChildrenArray,
  ensureDatabaseRowCells,
  findDatabaseColumn,
  isTitleAliasKey,
  availableDatabaseColumns,
  writeDatabaseCellValue,
  getDatabaseRowBlock,
  collectDescendantBlockIds,
  childIdsFrom,
  indexOfChild,
  getDatabaseRowIds,
  readDatabaseRowTitle,
  decodeDatabaseCellValue,
  readLinkedDocId,
  richTextValueToString,
  readDatabaseViewDefs,
  readColumnDefs,
  loadDatabaseDocContext,
  SELECT_COLORS,
} from "./util.js";

/**
 * Add a row to an AFFiNE database block.
 */
export async function addDatabaseRowHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  cells: Record<string, unknown>;
  linkedDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const rowBlockId = generateId();
    const rowBlock = new Y.Map<any>();
    setSysFields(rowBlock, rowBlockId, "affine:paragraph");
    rowBlock.set("sys:parent", parsed.databaseBlockId);
    rowBlock.set("sys:children", new Y.Array<string>());
    rowBlock.set("prop:type", "text");
    if (parsed.linkedDocId) {
      rowBlock.set("prop:text", makeLinkedDocText(parsed.linkedDocId));
    } else {
      const titleValue = resolveDatabaseTitleValue(parsed.cells, ctx);
      rowBlock.set("prop:text", makeText(String(titleValue)));
    }
    ctx.blocks.set(rowBlockId, rowBlock);

    const dbChildren = ensureChildrenArray(ctx.dbBlock);
    dbChildren.push([rowBlockId]);

    const rowCells = ensureDatabaseRowCells(ctx.cellsMap, rowBlockId);
    for (const [key, value] of Object.entries(parsed.cells)) {
      const col = findDatabaseColumn(key, ctx);
      if (!col) {
        if (isTitleAliasKey(key)) continue;
        throw new Error(
          `Column '${key}' not found. Available columns: ${availableDatabaseColumns(ctx)}`,
        );
      }
      writeDatabaseCellValue(rowCells, col, value, true);
    }

    const delta = Y.encodeStateAsUpdate(ctx.doc, ctx.prevSV);
    await pushDocUpdate(
      ctx.socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );

    return text({
      added: true,
      rowBlockId,
      databaseBlockId: parsed.databaseBlockId,
      cellCount: Object.keys(parsed.cells).length,
      linkedDocId: parsed.linkedDocId || null,
    });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Delete a row from an AFFiNE database block.
 */
export async function deleteDatabaseRowHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  rowBlockId: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const rowBlock = getDatabaseRowBlock(
      ctx.blocks,
      ctx.dbBlock,
      parsed.databaseBlockId,
      parsed.rowBlockId,
    );
    const descendantBlockIds = collectDescendantBlockIds(ctx.blocks, [
      parsed.rowBlockId,
      ...childIdsFrom(rowBlock.get("sys:children")),
    ]);
    const dbChildren = ensureChildrenArray(ctx.dbBlock);
    const rowIndex = indexOfChild(dbChildren, parsed.rowBlockId);
    if (rowIndex < 0) {
      throw new Error(
        `Row block '${parsed.rowBlockId}' is not present in database '${parsed.databaseBlockId}' children`,
      );
    }

    dbChildren.delete(rowIndex, 1);
    ctx.cellsMap.delete(parsed.rowBlockId);
    for (const blockId of descendantBlockIds) {
      ctx.blocks.delete(blockId);
    }

    const delta = Y.encodeStateAsUpdate(ctx.doc, ctx.prevSV);
    await pushDocUpdate(
      ctx.socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );

    return text({
      deleted: true,
      rowBlockId: parsed.rowBlockId,
      databaseBlockId: parsed.databaseBlockId,
    });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Read row titles and database cell values from an AFFiNE database block.
 */
export async function readDatabaseCellsHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  rowBlockIds?: string[];
  columns?: string[];
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const requestedRows = parsed.rowBlockIds?.length
      ? parsed.rowBlockIds
      : getDatabaseRowIds(ctx.dbBlock);

    const requestedColumns = parsed.columns?.length
      ? parsed.columns.map((columnKey) => {
          const col = findDatabaseColumn(columnKey, ctx);
          if (!col) {
            throw new Error(
              `Column '${columnKey}' not found. Available columns: ${availableDatabaseColumns(ctx)}`,
            );
          }
          return col;
        })
      : ctx.columnDefs;
    const requestedColumnIds = new Set(requestedColumns.map((col) => col.id));

    const rows = requestedRows.map((rowBlockId) => {
      const rowBlock = getDatabaseRowBlock(
        ctx.blocks,
        ctx.dbBlock,
        parsed.databaseBlockId,
        rowBlockId,
      );
      const title = readDatabaseRowTitle(rowBlock) || null;
      const rowCells = ctx.cellsMap.get(rowBlockId);
      const cells: Record<string, Record<string, unknown>> = {};

      if (rowCells instanceof Y.Map) {
        for (const col of ctx.columnDefs) {
          if (ctx.titleCol && col.id === ctx.titleCol.id) continue;
          if (!requestedColumnIds.has(col.id)) continue;
          const cellEntry = rowCells.get(col.id);
          if (cellEntry === undefined) continue;
          cells[col.name || col.id] = decodeDatabaseCellValue(col, cellEntry);
        }
      }

      return {
        rowBlockId,
        title,
        linkedDocId: readLinkedDocId(rowBlock),
        cells,
      };
    });

    return text({ rows });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Read schema metadata for an AFFiNE database block.
 */
export async function readDatabaseColumnsHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const columns = ctx.columnDefs.map((col) => ({
      id: col.id,
      name: col.name || null,
      type: col.type,
      options: col.options,
    }));

    return text({
      databaseBlockId: parsed.databaseBlockId,
      title: richTextValueToString(ctx.dbBlock.get("prop:title")) || null,
      rowCount: getDatabaseRowIds(ctx.dbBlock).length,
      columnCount: columns.length,
      titleColumnId: ctx.titleCol?.id || null,
      columns,
      views: readDatabaseViewDefs(ctx.dbBlock, ctx),
    });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Update a single cell on an existing AFFiNE database row.
 */
export async function updateDatabaseCellHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  rowBlockId: string;
  column: string;
  value: unknown;
  createOption?: boolean;
  linkedDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const rowBlock = getDatabaseRowBlock(
      ctx.blocks,
      ctx.dbBlock,
      parsed.databaseBlockId,
      parsed.rowBlockId,
    );
    const rowCells = ensureDatabaseRowCells(ctx.cellsMap, parsed.rowBlockId);
    const col = findDatabaseColumn(parsed.column, ctx);

    if (!col) {
      if (!isTitleAliasKey(parsed.column)) {
        throw new Error(
          `Column '${parsed.column}' not found. Available columns: ${availableDatabaseColumns(ctx)}`,
        );
      }
    } else {
      writeDatabaseCellValue(
        rowCells,
        col,
        parsed.value,
        parsed.createOption ?? true,
      );
    }

    if (parsed.linkedDocId) {
      rowBlock.set("prop:text", makeLinkedDocText(parsed.linkedDocId));
    } else if (
      isTitleAliasKey(parsed.column) ||
      (col && (col.type === "title" || isTitleAliasKey(col.name)))
    ) {
      rowBlock.set("prop:text", makeText(String(parsed.value ?? "")));
    }

    const delta = Y.encodeStateAsUpdate(ctx.doc, ctx.prevSV);
    await pushDocUpdate(
      ctx.socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );

    return text({
      updated: true,
      rowBlockId: parsed.rowBlockId,
      column: parsed.column,
      value: parsed.value ?? null,
    });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Batch update multiple cells on an existing AFFiNE database row.
 */
export async function updateDatabaseRowHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  rowBlockId: string;
  cells: Record<string, unknown>;
  createOption?: boolean;
  linkedDocId?: string;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const rowBlock = getDatabaseRowBlock(
      ctx.blocks,
      ctx.dbBlock,
      parsed.databaseBlockId,
      parsed.rowBlockId,
    );
    const rowCells = ensureDatabaseRowCells(ctx.cellsMap, parsed.rowBlockId);
    let titleValue: string | null = null;

    for (const [key, value] of Object.entries(parsed.cells)) {
      const col = findDatabaseColumn(key, ctx);
      if (!col) {
        if (isTitleAliasKey(key)) {
          titleValue = String(value ?? "");
          continue;
        }
        throw new Error(
          `Column '${key}' not found. Available columns: ${availableDatabaseColumns(ctx)}`,
        );
      }

      writeDatabaseCellValue(rowCells, col, value, parsed.createOption ?? true);
      if (col.type === "title" || isTitleAliasKey(col.name)) {
        titleValue = String(value ?? "");
      }
    }

    if (parsed.linkedDocId) {
      rowBlock.set("prop:text", makeLinkedDocText(parsed.linkedDocId));
    } else if (titleValue !== null) {
      rowBlock.set("prop:text", makeText(titleValue));
    }

    const delta = Y.encodeStateAsUpdate(ctx.doc, ctx.prevSV);
    await pushDocUpdate(
      ctx.socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );

    return text({
      updated: true,
      rowBlockId: parsed.rowBlockId,
      cellCount: Object.keys(parsed.cells).length,
    });
  } finally {
    ctx.socket.disconnect();
  }
}

/**
 * Add a column to an existing AFFiNE database block.
 */
export async function addDatabaseColumnHandler(parsed: {
  workspaceId?: string;
  docId: string;
  databaseBlockId: string;
  name: string;
  type: string;
  options?: string[];
  width?: number;
}) {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");

  const ctx = await loadDatabaseDocContext(
    workspaceId,
    parsed.docId,
    parsed.databaseBlockId,
  );
  try {
    const columns = ctx.dbBlock.get("prop:columns");
    if (!(columns instanceof Y.Array))
      throw new Error("Database has no columns array");

    const existingDefs = readColumnDefs(ctx.dbBlock);
    if (existingDefs.some((c) => c.name === parsed.name)) {
      throw new Error(`Column '${parsed.name}' already exists`);
    }

    const columnId = generateId();
    const column = new Y.Map<any>();
    column.set("id", columnId);
    column.set("name", parsed.name);
    column.set("type", parsed.type || "rich-text");
    column.set("width", parsed.width || 200);

    if (
      (parsed.type === "select" || parsed.type === "multi-select") &&
      parsed.options?.length
    ) {
      const data = new Y.Map<any>();
      const opts = new Y.Array<any>();
      for (let i = 0; i < parsed.options.length; i++) {
        const optMap = new Y.Map<any>();
        optMap.set("id", generateId());
        optMap.set("value", parsed.options[i]);
        optMap.set("color", SELECT_COLORS[i % SELECT_COLORS.length]);
        opts.push([optMap]);
      }
      data.set("options", opts);
      column.set("data", data);
    }

    columns.push([column]);

    const views = ctx.dbBlock.get("prop:views");
    if (views instanceof Y.Array) {
      views.forEach((view: any) => {
        if (view instanceof Y.Map) {
          const viewColumns = view.get("columns");
          if (viewColumns instanceof Y.Array) {
            const viewCol = new Y.Map<any>();
            viewCol.set("id", columnId);
            viewCol.set("hide", false);
            viewCol.set("width", parsed.width || 200);
            viewColumns.push([viewCol]);
          }
        }
      });
    }

    const delta = Y.encodeStateAsUpdate(ctx.doc, ctx.prevSV);
    await pushDocUpdate(
      ctx.socket,
      workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );

    return text({
      added: true,
      columnId,
      name: parsed.name,
      type: parsed.type || "rich-text",
    });
  } finally {
    ctx.socket.disconnect();
  }
}
