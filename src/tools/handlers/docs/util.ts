import { z } from "zod";
import * as Y from "yjs";
import { getGraphQLClient, getDefaultWorkspaceId } from "../utils.js";
import {
  wsUrlFromGraphQLEndpoint,
  connectWorkspaceSocket,
  joinWorkspace,
  loadDoc,
  pushDocUpdate,
} from "../../../ws.js";
import { parseMarkdownToOperations } from "../../../markdown/parse.js";
import type {
  MarkdownOperation,
  MarkdownRenderableBlock,
  TextDelta,
} from "../../../markdown/types.js";

export const WorkspaceId = z.string().min(1, "workspaceId required");
export const DocId = z.string().min(1, "docId required");
export const MarkdownContent = z.string().min(1, "markdown required");

export const APPEND_BLOCK_CANONICAL_TYPE_VALUES = [
  "paragraph",
  "heading",
  "quote",
  "list",
  "code",
  "divider",
  "callout",
  "latex",
  "table",
  "bookmark",
  "image",
  "attachment",
  "embed_youtube",
  "embed_github",
  "embed_figma",
  "embed_loom",
  "embed_html",
  "embed_linked_doc",
  "embed_synced_doc",
  "embed_iframe",
  "database",
  "data_view",
  "surface_ref",
  "frame",
  "edgeless_text",
  "note",
] as const;
export type AppendBlockCanonicalType =
  (typeof APPEND_BLOCK_CANONICAL_TYPE_VALUES)[number];

export const APPEND_BLOCK_LEGACY_ALIAS_MAP = {
  heading1: "heading",
  heading2: "heading",
  heading3: "heading",
  bulleted_list: "list",
  numbered_list: "list",
  todo: "list",
} as const;
export type AppendBlockLegacyType = keyof typeof APPEND_BLOCK_LEGACY_ALIAS_MAP;

export const APPEND_BLOCK_LIST_STYLE_VALUES = [
  "bulleted",
  "numbered",
  "todo",
] as const;
export type AppendBlockListStyle =
  (typeof APPEND_BLOCK_LIST_STYLE_VALUES)[number];
export const AppendBlockListStyle = z.enum(APPEND_BLOCK_LIST_STYLE_VALUES);

export const APPEND_BLOCK_BOOKMARK_STYLE_VALUES = [
  "vertical",
  "horizontal",
  "list",
  "cube",
  "citation",
] as const;
export type AppendBlockBookmarkStyle =
  (typeof APPEND_BLOCK_BOOKMARK_STYLE_VALUES)[number];
export const AppendBlockBookmarkStyle = z.enum(
  APPEND_BLOCK_BOOKMARK_STYLE_VALUES,
);

export const APPEND_BLOCK_DATA_VIEW_MODE_VALUES = ["table", "kanban"] as const;
export type AppendBlockDataViewMode =
  (typeof APPEND_BLOCK_DATA_VIEW_MODE_VALUES)[number];
export const AppendBlockDataViewMode = z.enum(
  APPEND_BLOCK_DATA_VIEW_MODE_VALUES,
);

export type AppendPlacement = {
  parentId?: string;
  afterBlockId?: string;
  beforeBlockId?: string;
  index?: number;
};

export type AppendBlockInput = {
  workspaceId?: string;
  docId: string;
  type: string;
  text?: string;
  deltas?: TextDelta[];
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
  tableData?: string[][];
  tableCellDeltas?: TextDelta[][][];
};

export type NormalizedAppendBlockInput = {
  workspaceId?: string;
  docId: string;
  type: AppendBlockCanonicalType;
  strict: boolean;
  placement?: AppendPlacement;
  text: string;
  url: string;
  pageId: string;
  iframeUrl: string;
  html: string;
  design: string;
  reference: string;
  refFlavour: string;
  width: number;
  height: number;
  background: string;
  sourceId: string;
  name: string;
  mimeType: string;
  size: number;
  embed: boolean;
  rows: number;
  columns: number;
  latex: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  listStyle: AppendBlockListStyle;
  bookmarkStyle: AppendBlockBookmarkStyle;
  dataViewMode: AppendBlockDataViewMode;
  checked: boolean;
  language: string;
  caption?: string;
  legacyType?: AppendBlockLegacyType;
  tableData?: string[][];
  deltas?: TextDelta[];
  tableCellDeltas?: TextDelta[][][];
};

export type CreateDocInput = {
  workspaceId?: string;
  title?: string;
  content?: string;
};

export type CreateDocResult = {
  workspaceId: string;
  docId: string;
  title: string;
};

export function blockVersion(flavour: string): number {
  switch (flavour) {
    case "affine:page":
      return 2;
    case "affine:surface":
      return 5;
    default:
      return 1;
  }
}

export function generateId(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  let id = "";
  for (let i = 0; i < 10; i++)
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

export async function getCookieAndEndpoint() {
  const gql = getGraphQLClient();
  const endpoint = gql.endpoint;
  const cookie = gql.cookie;
  const bearer = gql.bearer;
  return { endpoint, cookie, bearer };
}

export const SELECT_COLORS = [
  "var(--affine-tag-blue)",
  "var(--affine-tag-green)",
  "var(--affine-tag-red)",
  "var(--affine-tag-orange)",
  "var(--affine-tag-purple)",
  "var(--affine-tag-yellow)",
  "var(--affine-tag-teal)",
  "var(--affine-tag-pink)",
  "var(--affine-tag-gray)",
];

export function makeText(content: string | TextDelta[]): Y.Text {
  const yText = new Y.Text();
  if (typeof content === "string") {
    if (content.length > 0) {
      yText.insert(0, content);
    }
    return yText;
  }
  let offset = 0;
  for (const delta of content) {
    if (!delta.insert) {
      continue;
    }
    yText.insert(
      offset,
      delta.insert,
      delta.attributes ? { ...delta.attributes } : {},
    );
    offset += delta.insert.length;
  }
  return yText;
}

export function makeLinkedDocText(docId: string): Y.Text {
  const delta = [
    {
      insert: "\u200B",
      attributes: { reference: { type: "LinkedPage", pageId: docId } },
    },
  ];
  return makeText(delta as TextDelta[]);
}

export function readLinkedDocId(rowBlock: Y.Map<any>): string | null {
  const propText = rowBlock.get("prop:text");
  if (!(propText instanceof Y.Text)) return null;
  const delta = propText.toDelta();
  if (!Array.isArray(delta)) return null;
  for (const d of delta) {
    if (
      d.attributes?.reference?.type === "LinkedPage" &&
      d.attributes.reference.pageId
    ) {
      return d.attributes.reference.pageId;
    }
  }
  return null;
}

export function asText(value: unknown): string {
  if (value instanceof Y.Text) return value.toString();
  if (typeof value === "string") return value;
  return "";
}

export function childIdsFrom(value: unknown): string[] {
  if (!(value instanceof Y.Array)) return [];
  const childIds: string[] = [];
  value.forEach((entry: unknown) => {
    if (typeof entry === "string") {
      childIds.push(entry);
      return;
    }
    if (Array.isArray(entry)) {
      for (const child of entry) {
        if (typeof child === "string") {
          childIds.push(child);
        }
      }
    }
  });
  return childIds;
}

export function normalizeTag(rawTag: string): string {
  const normalized = rawTag.trim();
  if (!normalized) {
    throw new Error("tag is required");
  }
  return normalized;
}

export type WorkspaceTagOption = {
  id: string;
  value: string;
  color: string;
  createDate: number | null;
  updateDate: number | null;
};

export const TAG_OPTION_COLORS = [
  "var(--affine-tag-blue)",
  "var(--affine-tag-green)",
  "var(--affine-tag-red)",
  "var(--affine-tag-orange)",
  "var(--affine-tag-purple)",
  "var(--affine-tag-yellow)",
  "var(--affine-tag-teal)",
  "var(--affine-tag-pink)",
  "var(--affine-tag-gray)",
];

export function getStringArray(value: unknown): string[] {
  if (!(value instanceof Y.Array)) {
    return [];
  }
  const values: string[] = [];
  value.forEach((entry: unknown) => {
    if (typeof entry === "string") {
      values.push(entry);
    }
  });
  return values;
}

export function getTagArray(
  target: Y.Map<any>,
  key: string = "tags",
): Y.Array<string> | null {
  const value = target.get(key);
  if (!(value instanceof Y.Array)) {
    return null;
  }
  return value as Y.Array<string>;
}

export function ensureTagArray(
  target: Y.Map<any>,
  key: string = "tags",
): Y.Array<string> {
  const existing = getTagArray(target, key);
  if (existing) {
    return existing;
  }
  const next = new Y.Array<string>();
  target.set(key, next);
  return next;
}

export function getYMap(target: Y.Map<any>, key: string): Y.Map<any> | null {
  const value = target.get(key);
  if (!(value instanceof Y.Map)) {
    return null;
  }
  return value;
}

export function ensureYMap(target: Y.Map<any>, key: string): Y.Map<any> {
  const current = getYMap(target, key);
  if (current) {
    return current;
  }
  const next = new Y.Map<any>();
  target.set(key, next);
  return next;
}

export function getWorkspaceTagOptionsArray(
  meta: Y.Map<any>,
): Y.Array<any> | null {
  const properties = getYMap(meta, "properties");
  if (!properties) {
    return null;
  }
  const tags = getYMap(properties, "tags");
  if (!tags) {
    return null;
  }
  const options = tags.get("options");
  if (!(options instanceof Y.Array)) {
    return null;
  }
  return options;
}

export function ensureWorkspaceTagOptionsArray(meta: Y.Map<any>): Y.Array<any> {
  const properties = ensureYMap(meta, "properties");
  const tags = ensureYMap(properties, "tags");
  const existing = tags.get("options");
  if (existing instanceof Y.Array) {
    return existing;
  }
  const next = new Y.Array<any>();
  tags.set("options", next);
  return next;
}

export function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function parseWorkspaceTagOption(
  raw: unknown,
): WorkspaceTagOption | null {
  let id: unknown;
  let value: unknown;
  let color: unknown;
  let createDate: unknown;
  let updateDate: unknown;

  if (raw instanceof Y.Map) {
    id = raw.get("id");
    value = raw.get("value");
    color = raw.get("color");
    createDate = raw.get("createDate");
    updateDate = raw.get("updateDate");
  } else if (raw && typeof raw === "object") {
    id = (raw as any).id;
    value = (raw as any).value;
    color = (raw as any).color;
    createDate = (raw as any).createDate;
    updateDate = (raw as any).updateDate;
  } else {
    return null;
  }

  if (typeof id !== "string" || id.trim().length === 0) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return {
    id,
    value,
    color:
      typeof color === "string" && color.trim().length > 0
        ? color
        : TAG_OPTION_COLORS[0],
    createDate: asNumberOrNull(createDate),
    updateDate: asNumberOrNull(updateDate),
  };
}

export function getWorkspaceTagOptions(meta: Y.Map<any>): WorkspaceTagOption[] {
  const options = getWorkspaceTagOptionsArray(meta);
  if (!options) {
    return [];
  }
  const parsed: WorkspaceTagOption[] = [];
  options.forEach((raw: unknown) => {
    const option = parseWorkspaceTagOption(raw);
    if (option) {
      parsed.push(option);
    }
  });
  return parsed;
}

export function getWorkspaceTagOptionMaps(meta: Y.Map<any>): {
  options: WorkspaceTagOption[];
  byId: Map<string, WorkspaceTagOption>;
  byValueLower: Map<string, WorkspaceTagOption>;
} {
  const options = getWorkspaceTagOptions(meta);
  const byId = new Map<string, WorkspaceTagOption>();
  const byValueLower = new Map<string, WorkspaceTagOption>();
  for (const option of options) {
    if (!byId.has(option.id)) {
      byId.set(option.id, option);
    }
    const key = option.value.toLocaleLowerCase();
    if (!byValueLower.has(key)) {
      byValueLower.set(key, option);
    }
  }
  return { options, byId, byValueLower };
}

export function resolveTagLabels(
  tagEntries: string[],
  byId: Map<string, WorkspaceTagOption>,
): string[] {
  const deduped = new Set<string>();
  const resolved: string[] = [];
  for (const entry of tagEntries) {
    const raw = entry.trim();
    if (!raw) {
      continue;
    }
    const option = byId.get(raw);
    const label = (option ? option.value : raw).trim();
    if (!label) {
      continue;
    }
    const dedupeKey = label.toLocaleLowerCase();
    if (deduped.has(dedupeKey)) {
      continue;
    }
    deduped.add(dedupeKey);
    resolved.push(label);
  }
  return resolved;
}

export function ensureWorkspaceTagOption(
  meta: Y.Map<any>,
  tag: string,
): {
  option: WorkspaceTagOption;
  created: boolean;
} {
  const normalizedTag = normalizeTag(tag);
  const maps = getWorkspaceTagOptionMaps(meta);
  const existing = maps.byValueLower.get(normalizedTag.toLocaleLowerCase());
  if (existing) {
    return { option: existing, created: false };
  }

  const optionsArray = ensureWorkspaceTagOptionsArray(meta);
  const color =
    TAG_OPTION_COLORS[maps.options.length % TAG_OPTION_COLORS.length];
  const now = Date.now();
  const option: WorkspaceTagOption = {
    id: generateId(),
    value: normalizedTag,
    color,
    createDate: now,
    updateDate: now,
  };

  const optionMap = new Y.Map<any>();
  optionMap.set("id", option.id);
  optionMap.set("value", option.value);
  optionMap.set("color", option.color);
  optionMap.set("createDate", now);
  optionMap.set("updateDate", now);
  optionsArray.push([optionMap]);

  return { option, created: true };
}

export function collectMatchingTagIndexes(
  tags: Y.Array<string>,
  requestedTag: string,
  option: WorkspaceTagOption | null,
  ignoreCase: boolean,
): number[] {
  const normalizedRequested = ignoreCase
    ? requestedTag.toLocaleLowerCase()
    : requestedTag;
  const normalizedOptionId = option
    ? ignoreCase
      ? option.id.toLocaleLowerCase()
      : option.id
    : null;
  const normalizedOptionValue = option
    ? ignoreCase
      ? option.value.toLocaleLowerCase()
      : option.value
    : null;

  const indexes: number[] = [];
  tags.forEach((entry: unknown, index: number) => {
    if (typeof entry !== "string") {
      return;
    }
    const current = ignoreCase ? entry.toLocaleLowerCase() : entry;
    if (
      current === normalizedRequested ||
      (normalizedOptionId && current === normalizedOptionId) ||
      (normalizedOptionValue && current === normalizedOptionValue)
    ) {
      indexes.push(index);
    }
  });
  return indexes;
}

export function deleteArrayIndexes(
  arr: Y.Array<any>,
  indexes: number[],
): boolean {
  if (indexes.length === 0) {
    return false;
  }
  const sorted = [...indexes].sort((a, b) => b - a);
  for (const index of sorted) {
    arr.delete(index, 1);
  }
  return true;
}

export function syncTagArrayToOption(
  tags: Y.Array<string>,
  requestedTag: string,
  option: WorkspaceTagOption,
): {
  existed: boolean;
  changed: boolean;
} {
  const optionId = option.id.toLocaleLowerCase();
  const optionValue = option.value.toLocaleLowerCase();
  const requested = requestedTag.toLocaleLowerCase();

  let existed = false;
  let hasCanonicalId = false;
  const removeIndexes: number[] = [];

  tags.forEach((entry: unknown, index: number) => {
    if (typeof entry !== "string") {
      return;
    }
    const current = entry.toLocaleLowerCase();
    const matched =
      current === optionId || current === optionValue || current === requested;
    if (!matched) {
      return;
    }
    existed = true;
    if (current === optionId) {
      if (hasCanonicalId) {
        removeIndexes.push(index);
      } else {
        hasCanonicalId = true;
      }
      return;
    }
    removeIndexes.push(index);
  });

  let changed = deleteArrayIndexes(tags, removeIndexes);
  if (!hasCanonicalId) {
    tags.push([option.id]);
    changed = true;
  }
  return { existed, changed };
}

export function hasTag(
  tagValues: string[],
  tag: string,
  ignoreCase: boolean,
): boolean {
  const normalizedTag = ignoreCase ? tag.toLocaleLowerCase() : tag;
  return tagValues.some(
    (entry) =>
      (ignoreCase ? entry.toLocaleLowerCase() : entry) === normalizedTag,
  );
}

export type WorkspacePageEntry = {
  index: number;
  id: string;
  title: string | null;
  createDate: number | null;
  updatedDate: number | null;
  entry: Y.Map<any>;
  tagsArray: Y.Array<string> | null;
};

export function getWorkspacePageEntries(
  meta: Y.Map<any>,
): WorkspacePageEntry[] {
  const pages = meta.get("pages");
  if (!(pages instanceof Y.Array)) {
    return [];
  }

  const entries: WorkspacePageEntry[] = [];
  pages.forEach((value: unknown, index: number) => {
    if (!(value instanceof Y.Map)) {
      return;
    }
    const id = value.get("id");
    if (typeof id !== "string" || id.length === 0) {
      return;
    }
    const title = value.get("title");
    const createDate = value.get("createDate");
    const updatedDate = value.get("updatedDate");
    entries.push({
      index,
      id,
      title: typeof title === "string" ? title : null,
      createDate: typeof createDate === "number" ? createDate : null,
      updatedDate: typeof updatedDate === "number" ? updatedDate : null,
      entry: value,
      tagsArray: getTagArray(value),
    });
  });
  return entries;
}

export function setSysFields(
  block: Y.Map<any>,
  blockId: string,
  flavour: string,
): void {
  block.set("sys:id", blockId);
  block.set("sys:flavour", flavour);
  block.set("sys:version", blockVersion(flavour));
}

export function findBlockIdByFlavour(
  blocks: Y.Map<any>,
  flavour: string,
): string | null {
  for (const [, value] of blocks) {
    const block = value as Y.Map<any>;
    if (block?.get && block.get("sys:flavour") === flavour) {
      return String(block.get("sys:id"));
    }
  }
  return null;
}

export function ensureNoteBlock(blocks: Y.Map<any>): string {
  const existingNoteId = findBlockIdByFlavour(blocks, "affine:note");
  if (existingNoteId) {
    return existingNoteId;
  }

  const pageId = findBlockIdByFlavour(blocks, "affine:page");
  if (!pageId) {
    throw new Error("Document has no page block; unable to insert content.");
  }

  const noteId = generateId();
  const note = new Y.Map<any>();
  setSysFields(note, noteId, "affine:note");
  note.set("sys:parent", null);
  note.set("sys:children", new Y.Array<string>());
  note.set("prop:xywh", "[0,0,800,95]");
  note.set("prop:index", "a0");
  note.set("prop:hidden", false);
  note.set("prop:displayMode", "both");
  const background = new Y.Map<any>();
  background.set("light", "#ffffff");
  background.set("dark", "#252525");
  note.set("prop:background", background);
  blocks.set(noteId, note);

  const page = blocks.get(pageId) as Y.Map<any>;
  let pageChildren = page.get("sys:children") as Y.Array<string> | undefined;
  if (!(pageChildren instanceof Y.Array)) {
    pageChildren = new Y.Array<string>();
    page.set("sys:children", pageChildren);
  }
  pageChildren.push([noteId]);
  return noteId;
}

export function ensureSurfaceBlock(blocks: Y.Map<any>): string {
  const existingSurfaceId = findBlockIdByFlavour(blocks, "affine:surface");
  if (existingSurfaceId) {
    return existingSurfaceId;
  }

  const pageId = findBlockIdByFlavour(blocks, "affine:page");
  if (!pageId) {
    throw new Error(
      "Document has no page block; unable to create/find surface.",
    );
  }

  const surfaceId = generateId();
  const surface = new Y.Map<any>();
  setSysFields(surface, surfaceId, "affine:surface");
  surface.set("sys:parent", null);
  surface.set("sys:children", new Y.Array<string>());
  const elements = new Y.Map<any>();
  elements.set("type", "$blocksuite:internal:native$");
  elements.set("value", new Y.Map<any>());
  surface.set("prop:elements", elements);
  blocks.set(surfaceId, surface);

  const page = blocks.get(pageId) as Y.Map<any>;
  let pageChildren = page.get("sys:children") as Y.Array<string> | undefined;
  if (!(pageChildren instanceof Y.Array)) {
    pageChildren = new Y.Array<string>();
    page.set("sys:children", pageChildren);
  }
  pageChildren.push([surfaceId]);
  return surfaceId;
}

export function normalizeBlockTypeInput(typeInput: string): {
  type: AppendBlockCanonicalType;
  legacyType?: AppendBlockLegacyType;
  headingLevelFromAlias?: 1 | 2 | 3;
  listStyleFromAlias?: AppendBlockListStyle;
} {
  const key = typeInput.trim().toLowerCase();
  if ((APPEND_BLOCK_CANONICAL_TYPE_VALUES as readonly string[]).includes(key)) {
    return { type: key as AppendBlockCanonicalType };
  }

  if (
    Object.prototype.hasOwnProperty.call(APPEND_BLOCK_LEGACY_ALIAS_MAP, key)
  ) {
    const legacyType = key as AppendBlockLegacyType;
    const type = APPEND_BLOCK_LEGACY_ALIAS_MAP[legacyType];
    const listStyleFromAlias =
      legacyType === "bulleted_list"
        ? "bulleted"
        : legacyType === "numbered_list"
          ? "numbered"
          : legacyType === "todo"
            ? "todo"
            : undefined;
    const headingLevelFromAlias =
      legacyType === "heading1"
        ? 1
        : legacyType === "heading2"
          ? 2
          : legacyType === "heading3"
            ? 3
            : undefined;
    return { type, legacyType, headingLevelFromAlias, listStyleFromAlias };
  }

  const supported = [
    ...APPEND_BLOCK_CANONICAL_TYPE_VALUES,
    ...Object.keys(APPEND_BLOCK_LEGACY_ALIAS_MAP),
  ].join(", ");
  throw new Error(
    `Unsupported append_block type '${typeInput}'. Supported types: ${supported}`,
  );
}

export function normalizePlacement(
  placement: AppendPlacement | undefined,
): AppendPlacement | undefined {
  if (!placement) return undefined;

  const normalized: AppendPlacement = {};
  if (placement.parentId?.trim())
    normalized.parentId = placement.parentId.trim();
  if (placement.afterBlockId?.trim())
    normalized.afterBlockId = placement.afterBlockId.trim();
  if (placement.beforeBlockId?.trim())
    normalized.beforeBlockId = placement.beforeBlockId.trim();
  if (placement.index !== undefined) normalized.index = placement.index;

  const hasAfter = Boolean(normalized.afterBlockId);
  const hasBefore = Boolean(normalized.beforeBlockId);
  if (hasAfter && hasBefore) {
    throw new Error(
      "placement.afterBlockId and placement.beforeBlockId are mutually exclusive.",
    );
  }
  if (normalized.index !== undefined) {
    if (!Number.isInteger(normalized.index) || normalized.index < 0) {
      throw new Error(
        "placement.index must be an integer greater than or equal to 0.",
      );
    }
    if (hasAfter || hasBefore) {
      throw new Error(
        "placement.index cannot be used with placement.afterBlockId/beforeBlockId.",
      );
    }
  }

  if (
    !normalized.parentId &&
    !normalized.afterBlockId &&
    !normalized.beforeBlockId &&
    normalized.index === undefined
  ) {
    return undefined;
  }
  return normalized;
}

export function validateNormalizedAppendBlockInput(
  normalized: NormalizedAppendBlockInput,
  raw: AppendBlockInput,
): void {
  if (normalized.type === "heading") {
    if (
      !Number.isInteger(normalized.headingLevel) ||
      normalized.headingLevel < 1 ||
      normalized.headingLevel > 6
    ) {
      throw new Error("Heading level must be an integer from 1 to 6.");
    }
  } else if (raw.level !== undefined && normalized.strict) {
    throw new Error("The 'level' field can only be used with type='heading'.");
  }

  if (normalized.type === "list") {
    if (
      !(APPEND_BLOCK_LIST_STYLE_VALUES as readonly string[]).includes(
        normalized.listStyle,
      )
    ) {
      throw new Error(`Invalid list style '${normalized.listStyle}'.`);
    }
    if (
      normalized.listStyle !== "todo" &&
      raw.checked !== undefined &&
      normalized.strict
    ) {
      throw new Error(
        "The 'checked' field can only be used when list style is 'todo'.",
      );
    }
  } else {
    if (raw.style !== undefined && normalized.strict) {
      throw new Error("The 'style' field can only be used with type='list'.");
    }
    if (raw.checked !== undefined && normalized.strict) {
      throw new Error(
        "The 'checked' field can only be used with type='list' (style='todo').",
      );
    }
  }

  if (normalized.type !== "code") {
    if (raw.language !== undefined && normalized.strict) {
      throw new Error(
        "The 'language' field can only be used with type='code'.",
      );
    }
    const allowsCaption =
      normalized.type === "bookmark" ||
      normalized.type === "image" ||
      normalized.type === "attachment" ||
      normalized.type === "surface_ref" ||
      normalized.type.startsWith("embed_");
    if (raw.caption !== undefined && !allowsCaption && normalized.strict) {
      throw new Error("The 'caption' field is not valid for this block type.");
    }
  } else if (normalized.language.length > 64) {
    throw new Error("Code language is too long (max 64 chars).");
  }

  if (
    normalized.type === "divider" &&
    raw.text &&
    raw.text.length > 0 &&
    normalized.strict
  ) {
    throw new Error("Divider blocks do not accept text.");
  }

  const requiresUrl = [
    "bookmark",
    "embed_youtube",
    "embed_github",
    "embed_figma",
    "embed_loom",
    "embed_iframe",
  ] as const;
  const urlAllowedTypes = [...requiresUrl] as readonly string[];
  if (urlAllowedTypes.includes(normalized.type)) {
    if (!normalized.url) {
      throw new Error(`${normalized.type} blocks require a non-empty url.`);
    }
    try {
      new URL(normalized.url);
    } catch {
      throw new Error(
        `Invalid url for ${normalized.type} block: '${normalized.url}'.`,
      );
    }
  }

  if (normalized.type === "bookmark") {
    if (
      !(APPEND_BLOCK_BOOKMARK_STYLE_VALUES as readonly string[]).includes(
        normalized.bookmarkStyle,
      )
    ) {
      throw new Error(`Invalid bookmark style '${normalized.bookmarkStyle}'.`);
    }
  } else {
    if (raw.bookmarkStyle !== undefined && normalized.strict) {
      throw new Error(
        "The 'bookmarkStyle' field can only be used with type='bookmark'.",
      );
    }
    if (
      raw.url !== undefined &&
      !urlAllowedTypes.includes(normalized.type) &&
      normalized.strict
    ) {
      throw new Error("The 'url' field is not valid for this block type.");
    }
  }

  if (normalized.type === "image" || normalized.type === "attachment") {
    if (!normalized.sourceId) {
      throw new Error(
        `${normalized.type} blocks require sourceId (use upload_blob first).`,
      );
    }
    if (
      normalized.type === "attachment" &&
      (!normalized.name || !normalized.mimeType)
    ) {
      throw new Error("attachment blocks require valid name and mimeType.");
    }
  } else if (raw.sourceId !== undefined && normalized.strict) {
    throw new Error(
      "The 'sourceId' field can only be used with type='image' or type='attachment'.",
    );
  } else if (
    (raw.name !== undefined ||
      raw.mimeType !== undefined ||
      raw.embed !== undefined ||
      raw.size !== undefined) &&
    normalized.strict
  ) {
    throw new Error(
      "The 'name'/'mimeType'/'embed'/'size' fields are only valid for image/attachment blocks.",
    );
  }

  if (normalized.type === "latex") {
    if (!normalized.latex && normalized.strict) {
      throw new Error(
        "latex blocks require a non-empty 'latex' value in strict mode.",
      );
    }
  } else if (raw.latex !== undefined && normalized.strict) {
    throw new Error("The 'latex' field can only be used with type='latex'.");
  }

  if (
    normalized.type === "embed_linked_doc" ||
    normalized.type === "embed_synced_doc"
  ) {
    if (!normalized.pageId) {
      throw new Error(`${normalized.type} blocks require pageId.`);
    }
  } else if (raw.pageId !== undefined && normalized.strict) {
    throw new Error(
      "The 'pageId' field can only be used with linked/synced doc embed types.",
    );
  }

  if (normalized.type === "embed_html") {
    if (!normalized.html && !normalized.design && normalized.strict) {
      throw new Error("embed_html blocks require html or design.");
    }
  } else if (
    (raw.html !== undefined || raw.design !== undefined) &&
    normalized.strict
  ) {
    throw new Error(
      "The 'html'/'design' fields can only be used with type='embed_html'.",
    );
  }

  if (normalized.type === "embed_iframe") {
    if (
      raw.iframeUrl !== undefined &&
      !normalized.iframeUrl &&
      normalized.strict
    ) {
      throw new Error("embed_iframe iframeUrl cannot be empty when provided.");
    }
  } else if (raw.iframeUrl !== undefined && normalized.strict) {
    throw new Error(
      "The 'iframeUrl' field can only be used with type='embed_iframe'.",
    );
  }

  if (normalized.type === "surface_ref") {
    if (!normalized.reference) {
      throw new Error(
        "surface_ref blocks require 'reference' (target element/block id).",
      );
    }
    if (!normalized.refFlavour) {
      throw new Error(
        "surface_ref blocks require 'refFlavour' (for example affine:frame).",
      );
    }
  } else if (
    (raw.reference !== undefined || raw.refFlavour !== undefined) &&
    normalized.strict
  ) {
    throw new Error(
      "The 'reference'/'refFlavour' fields can only be used with type='surface_ref'.",
    );
  }

  if (
    normalized.type === "frame" ||
    normalized.type === "edgeless_text" ||
    normalized.type === "note"
  ) {
    if (
      !Number.isInteger(normalized.width) ||
      normalized.width < 1 ||
      normalized.width > 10000
    ) {
      throw new Error(
        `${normalized.type} width must be an integer between 1 and 10000.`,
      );
    }
    if (
      !Number.isInteger(normalized.height) ||
      normalized.height < 1 ||
      normalized.height > 10000
    ) {
      throw new Error(
        `${normalized.type} height must be an integer between 1 and 10000.`,
      );
    }
  } else if (
    (raw.width !== undefined || raw.height !== undefined) &&
    normalized.strict
  ) {
    throw new Error(
      "The 'width'/'height' fields are only valid for frame/edgeless_text/note.",
    );
  }

  if (
    normalized.type !== "frame" &&
    normalized.type !== "note" &&
    raw.background !== undefined &&
    normalized.strict
  ) {
    throw new Error("The 'background' field is only valid for frame/note.");
  }

  if (normalized.type === "table") {
    if (
      !Number.isInteger(normalized.rows) ||
      normalized.rows < 1 ||
      normalized.rows > 20
    ) {
      throw new Error("table rows must be an integer between 1 and 20.");
    }
    if (
      !Number.isInteger(normalized.columns) ||
      normalized.columns < 1 ||
      normalized.columns > 20
    ) {
      throw new Error("table columns must be an integer between 1 and 20.");
    }
    if (normalized.tableData) {
      if (
        !Array.isArray(normalized.tableData) ||
        normalized.tableData.length !== normalized.rows
      ) {
        throw new Error("tableData row count must match table rows.");
      }
      for (const row of normalized.tableData) {
        if (!Array.isArray(row) || row.length !== normalized.columns) {
          throw new Error("tableData column count must match table columns.");
        }
      }
    }
  } else if (
    (raw.rows !== undefined || raw.columns !== undefined) &&
    normalized.strict
  ) {
    throw new Error(
      "The 'rows'/'columns' fields can only be used with type='table'.",
    );
  } else if (raw.tableData !== undefined && normalized.strict) {
    throw new Error(
      "The 'tableData' field can only be used with type='table'.",
    );
  }

  if (
    normalized.type !== "database" &&
    normalized.type !== "data_view" &&
    raw.viewMode !== undefined &&
    normalized.strict
  ) {
    throw new Error(
      "The 'viewMode' field can only be used with type='database' or type='data_view'.",
    );
  }
}

export function normalizeAppendBlockInput(
  parsed: AppendBlockInput,
): NormalizedAppendBlockInput {
  const strict = parsed.strict !== false;
  const typeInfo = normalizeBlockTypeInput(parsed.type);
  const headingLevelCandidate =
    parsed.level ?? typeInfo.headingLevelFromAlias ?? 1;
  const headingLevelNumber = Number(headingLevelCandidate);
  const headingLevel = Math.max(1, Math.min(6, headingLevelNumber)) as
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6;
  const listStyle = typeInfo.listStyleFromAlias ?? parsed.style ?? "bulleted";
  const bookmarkStyle = parsed.bookmarkStyle ?? "horizontal";
  const dataViewMode =
    parsed.viewMode ?? (typeInfo.type === "data_view" ? "kanban" : "table");
  const language = (parsed.language ?? "txt").trim().toLowerCase() || "txt";
  const placement = normalizePlacement(parsed.placement);
  const url = (parsed.url ?? "").trim();
  const pageId = (parsed.pageId ?? "").trim();
  const iframeUrl = (parsed.iframeUrl ?? "").trim();
  const html = parsed.html ?? "";
  const design = parsed.design ?? "";
  const reference = (parsed.reference ?? "").trim();
  const refFlavour = (parsed.refFlavour ?? "").trim();
  const width = Number.isFinite(parsed.width)
    ? Math.max(1, Math.floor(parsed.width as number))
    : 100;
  const height = Number.isFinite(parsed.height)
    ? Math.max(1, Math.floor(parsed.height as number))
    : 100;
  const background =
    (parsed.background ?? "transparent").trim() || "transparent";
  const sourceId = (parsed.sourceId ?? "").trim();
  const name = (parsed.name ?? "attachment").trim() || "attachment";
  const mimeType =
    (parsed.mimeType ?? "application/octet-stream").trim() ||
    "application/octet-stream";
  const size = Number.isFinite(parsed.size)
    ? Math.max(0, Math.floor(parsed.size as number))
    : 0;
  const rows = Number.isInteger(parsed.rows) ? (parsed.rows as number) : 3;
  const columns = Number.isInteger(parsed.columns)
    ? (parsed.columns as number)
    : 3;
  const latex = (parsed.latex ?? "").trim();
  const tableData = Array.isArray(parsed.tableData)
    ? parsed.tableData
    : undefined;
  const tableCellDeltas = Array.isArray(parsed.tableCellDeltas)
    ? parsed.tableCellDeltas
    : undefined;

  const normalized: NormalizedAppendBlockInput = {
    workspaceId: parsed.workspaceId,
    docId: parsed.docId,
    type: typeInfo.type,
    strict,
    placement,
    text: parsed.text ?? "",
    url,
    pageId,
    iframeUrl,
    html,
    design,
    reference,
    refFlavour,
    width,
    height,
    background,
    sourceId,
    name,
    mimeType,
    size,
    embed: Boolean(parsed.embed),
    rows,
    columns,
    latex,
    headingLevel,
    listStyle,
    bookmarkStyle,
    dataViewMode,
    checked: Boolean(parsed.checked),
    language,
    caption: parsed.caption,
    legacyType: typeInfo.legacyType,
    tableData,
    deltas: parsed.deltas,
    tableCellDeltas,
  };

  validateNormalizedAppendBlockInput(normalized, parsed);
  return normalized;
}

export function findBlockById(
  blocks: Y.Map<any>,
  blockId: string,
): Y.Map<any> | null {
  const value = blocks.get(blockId);
  if (value instanceof Y.Map) return value;
  return null;
}

export function ensureChildrenArray(block: Y.Map<any>): Y.Array<any> {
  const current = block.get("sys:children");
  if (current instanceof Y.Array) return current;
  const created = new Y.Array<any>();
  block.set("sys:children", created);
  return created;
}

export function indexOfChild(children: Y.Array<any>, blockId: string): number {
  let index = -1;
  children.forEach((entry: unknown, i: number) => {
    if (index >= 0) return;
    if (typeof entry === "string") {
      if (entry === blockId) index = i;
      return;
    }
    if (Array.isArray(entry)) {
      for (const child of entry) {
        if (child === blockId) {
          index = i;
          return;
        }
      }
    }
  });
  return index;
}

export function findParentIdByChild(
  blocks: Y.Map<any>,
  childId: string,
): string | null {
  for (const [id, value] of blocks) {
    if (!(value instanceof Y.Map)) {
      continue;
    }
    const childIds = childIdsFrom(value.get("sys:children"));
    if (childIds.includes(childId)) {
      return String(id);
    }
  }
  return null;
}

export function resolveBlockParentId(
  blocks: Y.Map<any>,
  blockId: string,
): string | null {
  const block = findBlockById(blocks, blockId);
  if (!block) {
    return null;
  }
  const rawParentId = block.get("sys:parent");
  if (typeof rawParentId === "string" && rawParentId.trim().length > 0) {
    return rawParentId;
  }
  return findParentIdByChild(blocks, blockId);
}

export function resolveInsertContext(
  blocks: Y.Map<any>,
  normalized: NormalizedAppendBlockInput,
): {
  parentId: string;
  parentBlock: Y.Map<any>;
  children: Y.Array<any>;
  insertIndex: number;
} {
  const placement = normalized.placement;
  let parentId: string | undefined;
  let referenceBlockId: string | undefined;
  let mode: "append" | "index" | "after" | "before" = "append";

  if (placement?.afterBlockId) {
    mode = "after";
    referenceBlockId = placement.afterBlockId;
    const referenceBlock = findBlockById(blocks, referenceBlockId);
    if (!referenceBlock)
      throw new Error(
        `placement.afterBlockId '${referenceBlockId}' was not found.`,
      );
    const refParentId = resolveBlockParentId(blocks, referenceBlockId);
    if (!refParentId) {
      throw new Error(`Block '${referenceBlockId}' has no parent.`);
    }
    parentId = refParentId;
  } else if (placement?.beforeBlockId) {
    mode = "before";
    referenceBlockId = placement.beforeBlockId;
    const referenceBlock = findBlockById(blocks, referenceBlockId);
    if (!referenceBlock)
      throw new Error(
        `placement.beforeBlockId '${referenceBlockId}' was not found.`,
      );
    const refParentId = resolveBlockParentId(blocks, referenceBlockId);
    if (!refParentId) {
      throw new Error(`Block '${referenceBlockId}' has no parent.`);
    }
    parentId = refParentId;
  } else if (placement?.parentId) {
    mode = placement.index !== undefined ? "index" : "append";
    parentId = placement.parentId;
  }

  if (!parentId) {
    if (normalized.type === "frame" || normalized.type === "edgeless_text") {
      parentId = ensureSurfaceBlock(blocks);
    } else if (normalized.type === "note") {
      parentId = findBlockIdByFlavour(blocks, "affine:page") || undefined;
      if (!parentId) {
        throw new Error("Document has no page block; unable to insert note.");
      }
    } else {
      parentId = ensureNoteBlock(blocks);
    }
  }
  const parentBlock = findBlockById(blocks, parentId);
  if (!parentBlock) {
    throw new Error(`Target parent block '${parentId}' was not found.`);
  }
  const parentFlavour = parentBlock.get("sys:flavour");
  if (normalized.strict) {
    if (parentFlavour === "affine:page" && normalized.type !== "note") {
      throw new Error(
        `Cannot append '${normalized.type}' directly under 'affine:page'.`,
      );
    }
    if (
      parentFlavour === "affine:surface" &&
      normalized.type !== "frame" &&
      normalized.type !== "edgeless_text"
    ) {
      throw new Error(
        `Cannot append '${normalized.type}' directly under 'affine:surface'.`,
      );
    }
    if (normalized.type === "note" && parentFlavour !== "affine:page") {
      throw new Error("note blocks must be appended under affine:page.");
    }
    if (
      (normalized.type === "frame" || normalized.type === "edgeless_text") &&
      parentFlavour !== "affine:surface"
    ) {
      throw new Error(
        `${normalized.type} blocks must be appended under affine:surface.`,
      );
    }
  }

  const children = ensureChildrenArray(parentBlock);
  let insertIndex = children.length;
  if (mode === "after" || mode === "before") {
    const idx = indexOfChild(children, referenceBlockId as string);
    if (idx < 0) {
      throw new Error(
        `Reference block '${referenceBlockId}' is not a child of parent '${parentId}'.`,
      );
    }
    insertIndex = mode === "after" ? idx + 1 : idx;
  } else if (mode === "index") {
    const requestedIndex = placement?.index ?? children.length;
    if (requestedIndex > children.length && normalized.strict) {
      throw new Error(
        `placement.index ${requestedIndex} is out of range (max ${children.length}).`,
      );
    }
    insertIndex = Math.min(requestedIndex, children.length);
  }

  return { parentId, parentBlock, children, insertIndex };
}

export function createDatabaseViewColumn(
  columnId: string,
  width: number = 200,
  hide: boolean = false,
): Y.Map<any> {
  const column = new Y.Map<any>();
  column.set("id", columnId);
  column.set("width", width);
  column.set("hide", hide);
  return column;
}

export function createDatabaseColumnDefinition(input: {
  id: string;
  name: string;
  type: string;
  width?: number;
  options?: string[];
}): Y.Map<any> {
  const column = new Y.Map<any>();
  column.set("id", input.id);
  column.set("name", input.name);
  column.set("type", input.type);
  column.set("width", input.width ?? 200);

  if (
    (input.type === "select" || input.type === "multi-select") &&
    input.options?.length
  ) {
    const data = new Y.Map<any>();
    const options = new Y.Array<any>();
    input.options.forEach((value, index) => {
      const option = new Y.Map<any>();
      option.set("id", generateId());
      option.set("value", value);
      option.set("color", SELECT_COLORS[index % SELECT_COLORS.length]);
      options.push([option]);
    });
    data.set("options", options);
    column.set("data", data);
  }

  return column;
}

export function createPresetBackedDataViewBlock(
  blockId: string,
  titleText: string,
  viewMode: AppendBlockDataViewMode,
  blockType: string,
): { blockId: string; block: Y.Map<any>; flavour: string; blockType: string } {
  const block = new Y.Map<any>();
  setSysFields(block, blockId, "affine:database");
  block.set("sys:parent", null);
  block.set("sys:children", new Y.Array<string>());
  block.set("prop:title", makeText(titleText));
  block.set("prop:cells", new Y.Map<any>());
  block.set("prop:comments", undefined);

  const titleColumnId = generateId();
  const columns = new Y.Array<any>();
  columns.push([
    createDatabaseColumnDefinition({
      id: titleColumnId,
      name: "Title",
      type: "title",
      width: 320,
    }),
  ]);

  const viewColumns = new Y.Array<any>();
  viewColumns.push([createDatabaseViewColumn(titleColumnId, 320, false)]);
  const header = {
    titleColumn: titleColumnId,
    iconColumn: "type",
  };

  let groupBy: Record<string, string> | null = null;
  let groupProperties: unknown[] | null = null;

  if (viewMode === "kanban") {
    const statusColumnId = generateId();
    columns.push([
      createDatabaseColumnDefinition({
        id: statusColumnId,
        name: "Status",
        type: "select",
        options: ["Todo", "In Progress", "Done"],
      }),
    ]);
    viewColumns.push([createDatabaseViewColumn(statusColumnId, 200, false)]);
    groupBy = {
      columnId: statusColumnId,
      name: "select",
      type: "groupBy",
    };
    groupProperties = [];
  }

  const view = new Y.Map<any>();
  view.set("id", generateId());
  view.set("name", viewMode === "kanban" ? "Kanban View" : "Table View");
  view.set("mode", viewMode);
  view.set("columns", viewColumns);
  view.set("filter", { type: "group", op: "and", conditions: [] });
  if (groupBy) {
    view.set("groupBy", groupBy);
  } else {
    view.set("groupBy", null);
  }
  if (groupProperties) {
    view.set("groupProperties", groupProperties);
  }
  view.set("sort", null);
  view.set("header", header);

  const views = new Y.Array<any>();
  views.push([view]);

  block.set("prop:columns", columns);
  block.set("prop:views", views);

  return {
    blockId,
    block,
    flavour: "affine:database",
    blockType,
  };
}

export function createBlock(normalized: NormalizedAppendBlockInput): {
  blockId: string;
  block: Y.Map<any>;
  flavour: string;
  blockType?: string;
  extraBlocks?: Array<{ blockId: string; block: Y.Map<any> }>;
} {
  const blockId = generateId();
  const block = new Y.Map<any>();
  const content = normalized.text;

  switch (normalized.type) {
    case "paragraph":
    case "heading":
    case "quote": {
      setSysFields(block, blockId, "affine:paragraph");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      const blockType =
        normalized.type === "heading"
          ? (`h${normalized.headingLevel}` as const)
          : normalized.type === "quote"
            ? "quote"
            : "text";
      block.set("prop:type", blockType);
      block.set("prop:text", makeText(content));
      return { blockId, block, flavour: "affine:paragraph", blockType };
    }
    case "list": {
      setSysFields(block, blockId, "affine:list");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:type", normalized.listStyle);
      block.set(
        "prop:checked",
        normalized.listStyle === "todo" ? normalized.checked : false,
      );
      block.set("prop:text", makeText(normalized.deltas ?? content));
      return {
        blockId,
        block,
        flavour: "affine:list",
        blockType: normalized.listStyle,
      };
    }
    case "code": {
      setSysFields(block, blockId, "affine:code");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:language", normalized.language);
      if (normalized.caption) {
        block.set("prop:caption", normalized.caption);
      }
      block.set("prop:text", makeText(content));
      return { blockId, block, flavour: "affine:code" };
    }
    case "divider": {
      setSysFields(block, blockId, "affine:divider");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      return { blockId, block, flavour: "affine:divider" };
    }
    case "callout": {
      setSysFields(block, blockId, "affine:callout");
      block.set("sys:parent", null);
      const calloutChildren = new Y.Array<string>();
      const textBlockId = generateId();
      const textBlock = new Y.Map<any>();
      setSysFields(textBlock, textBlockId, "affine:paragraph");
      textBlock.set("sys:parent", null);
      textBlock.set("sys:children", new Y.Array<string>());
      textBlock.set("prop:type", "text");
      textBlock.set("prop:text", makeText(content));
      calloutChildren.push([textBlockId]);
      block.set("sys:children", calloutChildren);
      block.set("prop:icon", { type: "emoji", unicode: "💡" });
      block.set("prop:backgroundColorName", "grey");
      return {
        blockId,
        block,
        flavour: "affine:callout",
        extraBlocks: [{ blockId: textBlockId, block: textBlock }],
      };
    }
    case "latex": {
      setSysFields(block, blockId, "affine:latex");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:xywh", "[0,0,16,16]");
      block.set("prop:index", "a0");
      block.set("prop:lockedBySelf", false);
      block.set("prop:scale", 1);
      block.set("prop:rotate", 0);
      block.set("prop:latex", normalized.latex);
      return { blockId, block, flavour: "affine:latex" };
    }
    case "table": {
      setSysFields(block, blockId, "affine:table");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());

      const rowIds: string[] = [];
      const columnIds: string[] = [];
      const tableData = normalized.tableData ?? [];

      for (let i = 0; i < normalized.rows; i++) {
        const rowId = generateId();
        block.set(`prop:rows.${rowId}.rowId`, rowId);
        block.set(`prop:rows.${rowId}.order`, `r${String(i).padStart(4, "0")}`);
        rowIds.push(rowId);
      }
      for (let i = 0; i < normalized.columns; i++) {
        const columnId = generateId();
        block.set(`prop:columns.${columnId}.columnId`, columnId);
        block.set(
          `prop:columns.${columnId}.order`,
          `c${String(i).padStart(4, "0")}`,
        );
        columnIds.push(columnId);
      }
      for (let rowIndex = 0; rowIndex < rowIds.length; rowIndex += 1) {
        const rowId = rowIds[rowIndex];
        const isHeader = rowIndex === 0;
        for (
          let columnIndex = 0;
          columnIndex < columnIds.length;
          columnIndex += 1
        ) {
          const columnId = columnIds[columnIndex];
          const cellText = tableData[rowIndex]?.[columnIndex] ?? "";
          const cellDeltas =
            normalized.tableCellDeltas?.[rowIndex]?.[columnIndex] ?? [];
          const cellYText = new Y.Text();
          if (cellDeltas.length > 0) {
            let offset = 0;
            for (const delta of cellDeltas) {
              if (!delta.insert) {
                continue;
              }
              const attrs = isHeader
                ? { ...(delta.attributes ?? {}), bold: true }
                : delta.attributes
                  ? { ...delta.attributes }
                  : {};
              cellYText.insert(offset, delta.insert, attrs);
              offset += delta.insert.length;
            }
          } else if (isHeader && cellText) {
            cellYText.insert(0, cellText, { bold: true });
          } else {
            cellYText.insert(0, cellText);
          }
          block.set(`prop:cells.${rowId}:${columnId}.text`, cellYText);
        }
      }

      block.set("prop:comments", undefined);
      block.set("prop:textAlign", undefined);
      return { blockId, block, flavour: "affine:table" };
    }
    case "bookmark": {
      setSysFields(block, blockId, "affine:bookmark");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:style", normalized.bookmarkStyle);
      block.set("prop:url", normalized.url);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:description", null);
      block.set("prop:icon", null);
      block.set("prop:image", null);
      block.set("prop:title", null);
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:index", "a0");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:footnoteIdentifier", null);
      return { blockId, block, flavour: "affine:bookmark" };
    }
    case "image": {
      setSysFields(block, blockId, "affine:image");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:caption", normalized.caption ?? "");
      block.set("prop:sourceId", normalized.sourceId);
      block.set("prop:width", 0);
      block.set("prop:height", 0);
      block.set("prop:size", normalized.size || -1);
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:index", "a0");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      return { blockId, block, flavour: "affine:image" };
    }
    case "attachment": {
      setSysFields(block, blockId, "affine:attachment");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:name", normalized.name);
      block.set("prop:size", normalized.size);
      block.set("prop:type", normalized.mimeType);
      block.set("prop:sourceId", normalized.sourceId);
      block.set("prop:caption", normalized.caption ?? undefined);
      block.set("prop:embed", normalized.embed);
      block.set("prop:style", "horizontalThin");
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:footnoteIdentifier", null);
      return { blockId, block, flavour: "affine:attachment" };
    }
    case "embed_youtube": {
      setSysFields(block, blockId, "affine:embed-youtube");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "video");
      block.set("prop:url", normalized.url);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:image", null);
      block.set("prop:title", null);
      block.set("prop:description", null);
      block.set("prop:creator", null);
      block.set("prop:creatorUrl", null);
      block.set("prop:creatorImage", null);
      block.set("prop:videoId", null);
      return { blockId, block, flavour: "affine:embed-youtube" };
    }
    case "embed_github": {
      setSysFields(block, blockId, "affine:embed-github");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "horizontal");
      block.set("prop:owner", "");
      block.set("prop:repo", "");
      block.set("prop:githubType", "issue");
      block.set("prop:githubId", "");
      block.set("prop:url", normalized.url);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:image", null);
      block.set("prop:status", null);
      block.set("prop:statusReason", null);
      block.set("prop:title", null);
      block.set("prop:description", null);
      block.set("prop:createdAt", null);
      block.set("prop:assignees", null);
      return { blockId, block, flavour: "affine:embed-github" };
    }
    case "embed_figma": {
      setSysFields(block, blockId, "affine:embed-figma");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "figma");
      block.set("prop:url", normalized.url);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:title", null);
      block.set("prop:description", null);
      return { blockId, block, flavour: "affine:embed-figma" };
    }
    case "embed_loom": {
      setSysFields(block, blockId, "affine:embed-loom");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "video");
      block.set("prop:url", normalized.url);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:image", null);
      block.set("prop:title", null);
      block.set("prop:description", null);
      block.set("prop:videoId", null);
      return { blockId, block, flavour: "affine:embed-loom" };
    }
    case "embed_html": {
      setSysFields(block, blockId, "affine:embed-html");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "html");
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:html", normalized.html || undefined);
      block.set("prop:design", normalized.design || undefined);
      return { blockId, block, flavour: "affine:embed-html" };
    }
    case "embed_linked_doc": {
      setSysFields(block, blockId, "affine:embed-linked-doc");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "horizontal");
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:pageId", normalized.pageId);
      block.set("prop:title", undefined);
      block.set("prop:description", undefined);
      block.set("prop:footnoteIdentifier", null);
      return { blockId, block, flavour: "affine:embed-linked-doc" };
    }
    case "embed_synced_doc": {
      setSysFields(block, blockId, "affine:embed-synced-doc");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,800,100]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:rotate", 0);
      block.set("prop:style", "syncedDoc");
      block.set("prop:caption", normalized.caption ?? undefined);
      block.set("prop:pageId", normalized.pageId);
      block.set("prop:scale", undefined);
      block.set("prop:preFoldHeight", undefined);
      block.set("prop:title", undefined);
      block.set("prop:description", undefined);
      return { blockId, block, flavour: "affine:embed-synced-doc" };
    }
    case "embed_iframe": {
      setSysFields(block, blockId, "affine:embed-iframe");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:index", "a0");
      block.set("prop:xywh", "[0,0,0,0]");
      block.set("prop:lockedBySelf", false);
      block.set("prop:scale", 1);
      block.set("prop:url", normalized.url);
      block.set("prop:iframeUrl", normalized.iframeUrl || normalized.url);
      block.set("prop:width", undefined);
      block.set("prop:height", undefined);
      block.set("prop:caption", normalized.caption ?? null);
      block.set("prop:title", null);
      block.set("prop:description", null);
      return { blockId, block, flavour: "affine:embed-iframe" };
    }
    case "database": {
      if (normalized.dataViewMode === "kanban") {
        return createPresetBackedDataViewBlock(
          blockId,
          normalized.text,
          "kanban",
          "database_kanban",
        );
      }
      setSysFields(block, blockId, "affine:database");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      const defaultView = new Y.Map<any>();
      defaultView.set("id", generateId());
      defaultView.set("name", "Table View");
      defaultView.set("mode", "table");
      defaultView.set("columns", new Y.Array<any>());
      defaultView.set("filter", { type: "group", op: "and", conditions: [] });
      defaultView.set("groupBy", null);
      defaultView.set("sort", null);
      defaultView.set("header", { titleColumn: null, iconColumn: null });
      const views = new Y.Array<any>();
      views.push([defaultView]);
      block.set("prop:views", views);
      block.set("prop:title", makeText(content));
      block.set("prop:cells", new Y.Map<any>());
      block.set("prop:columns", new Y.Array<any>());
      block.set("prop:comments", undefined);
      return { blockId, block, flavour: "affine:database" };
    }
    case "data_view": {
      return createPresetBackedDataViewBlock(
        blockId,
        normalized.text,
        normalized.dataViewMode,
        `data_view_${normalized.dataViewMode}`,
      );
    }
    case "surface_ref": {
      setSysFields(block, blockId, "affine:surface-ref");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:reference", normalized.reference);
      block.set("prop:caption", normalized.caption ?? "");
      block.set("prop:refFlavour", normalized.refFlavour);
      block.set("prop:comments", undefined);
      return { blockId, block, flavour: "affine:surface-ref" };
    }
    case "frame": {
      setSysFields(block, blockId, "affine:frame");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:title", makeText(content || "Frame"));
      block.set("prop:background", normalized.background);
      block.set("prop:xywh", `[0,0,${normalized.width},${normalized.height}]`);
      block.set("prop:index", "a0");
      block.set("prop:childElementIds", new Y.Map<any>());
      block.set("prop:presentationIndex", "a0");
      block.set("prop:lockedBySelf", false);
      return { blockId, block, flavour: "affine:frame" };
    }
    case "edgeless_text": {
      setSysFields(block, blockId, "affine:edgeless-text");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:xywh", `[0,0,${normalized.width},${normalized.height}]`);
      block.set("prop:index", "a0");
      block.set("prop:lockedBySelf", false);
      block.set("prop:scale", 1);
      block.set("prop:rotate", 0);
      block.set("prop:hasMaxWidth", false);
      block.set("prop:comments", undefined);
      block.set("prop:color", "black");
      block.set("prop:fontFamily", "Inter");
      block.set("prop:fontStyle", "normal");
      block.set("prop:fontWeight", "regular");
      block.set("prop:textAlign", "left");
      return { blockId, block, flavour: "affine:edgeless-text" };
    }
    case "note": {
      setSysFields(block, blockId, "affine:note");
      block.set("sys:parent", null);
      block.set("sys:children", new Y.Array<string>());
      block.set("prop:xywh", `[0,0,${normalized.width},${normalized.height}]`);
      block.set("prop:background", normalized.background);
      block.set("prop:index", "a0");
      block.set("prop:lockedBySelf", false);
      block.set("prop:hidden", false);
      block.set("prop:displayMode", "both");
      const edgeless = new Y.Map<any>();
      const style = new Y.Map<any>();
      style.set("borderRadius", 8);
      style.set("borderSize", 1);
      style.set("borderStyle", "solid");
      style.set("shadowType", "none");
      edgeless.set("style", style);
      block.set("prop:edgeless", edgeless);
      block.set("prop:comments", undefined);
      return { blockId, block, flavour: "affine:note" };
    }
  }
}

export async function appendBlockInternal(parsed: AppendBlockInput) {
  const normalized = normalizeAppendBlockInput(parsed);
  const workspaceId = normalized.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");

  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);

    const doc = new Y.Doc();
    const snapshot = await loadDoc(socket, workspaceId, normalized.docId);
    if (snapshot.missing) {
      Y.applyUpdate(doc, Buffer.from(snapshot.missing, "base64"));
    }

    const prevSV = Y.encodeStateVector(doc);
    const blocks = doc.getMap("blocks") as Y.Map<any>;
    const context = resolveInsertContext(blocks, normalized);
    const { blockId, block, flavour, blockType, extraBlocks } =
      createBlock(normalized);

    blocks.set(blockId, block);
    if (Array.isArray(extraBlocks)) {
      for (const extra of extraBlocks) {
        blocks.set(extra.blockId, extra.block);
      }
    }
    if (context.insertIndex >= context.children.length) {
      context.children.push([blockId]);
    } else {
      context.children.insert(context.insertIndex, [blockId]);
    }

    const delta = Y.encodeStateAsUpdate(doc, prevSV);
    await pushDocUpdate(
      socket,
      workspaceId,
      normalized.docId,
      Buffer.from(delta).toString("base64"),
    );

    return {
      appended: true,
      blockId,
      flavour,
      blockType,
      normalizedType: normalized.type,
      legacyType: normalized.legacyType || null,
    };
  } finally {
    socket.disconnect();
  }
}

export function mergeWarnings(...sources: string[][]): string[] {
  const deduped = new Set<string>();
  for (const source of sources) {
    for (const warning of source) {
      deduped.add(warning);
    }
  }
  return [...deduped];
}

export function markdownOperationToAppendInput(
  operation: MarkdownOperation,
  docId: string,
  workspaceId?: string,
  strict: boolean = true,
  placement?: AppendPlacement,
): AppendBlockInput {
  switch (operation.type) {
    case "heading":
      return {
        workspaceId,
        docId,
        type: "heading",
        text: operation.text,
        level: operation.level,
        strict,
        placement,
      };
    case "paragraph":
      return {
        workspaceId,
        docId,
        type: "paragraph",
        text: operation.text,
        strict,
        placement,
      };
    case "quote":
      return {
        workspaceId,
        docId,
        type: "quote",
        text: operation.text,
        strict,
        placement,
      };
    case "callout":
      return {
        workspaceId,
        docId,
        type: "callout",
        text: operation.text,
        strict,
        placement,
      };
    case "list":
      return {
        workspaceId,
        docId,
        type: "list",
        text: operation.text,
        style: operation.style,
        checked: operation.checked,
        deltas: operation.deltas,
        strict,
        placement,
      };
    case "code":
      return {
        workspaceId,
        docId,
        type: "code",
        text: operation.text,
        language: operation.language,
        strict,
        placement,
      };
    case "divider":
      return { workspaceId, docId, type: "divider", strict, placement };
    case "table":
      return {
        workspaceId,
        docId,
        type: "table",
        rows: operation.rows,
        columns: operation.columns,
        tableData: operation.tableData,
        tableCellDeltas: operation.tableCellDeltas,
        strict,
        placement,
      };
    case "bookmark":
      return {
        workspaceId,
        docId,
        type: "bookmark",
        url: operation.url,
        caption: operation.caption,
        strict,
        placement,
      };
    default: {
      const exhaustiveCheck: never = operation;
      throw new Error(
        `Unsupported markdown operation type: ${(exhaustiveCheck as any).type}`,
      );
    }
  }
}

export function collectDescendantBlockIds(
  blocks: Y.Map<any>,
  startIds: string[],
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const stack = [...startIds];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    const block = findBlockById(blocks, current);
    if (!block) continue;
    const children = childIdsFrom(block.get("sys:children"));
    for (const childId of children) stack.push(childId);
  }
  return result;
}

export function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function richTextValueToString(value: unknown): string {
  if (value instanceof Y.Text) return value.toString();
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (
          entry &&
          typeof entry === "object" &&
          typeof (entry as any).insert === "string"
        )
          return (entry as any).insert as string;
        return "";
      })
      .join("");
  }
  if (
    value &&
    typeof value === "object" &&
    typeof (value as any).insert === "string"
  )
    return (value as any).insert as string;
  return "";
}

export function mapEntries(value: unknown): Array<[string, any]> {
  if (value instanceof Y.Map) {
    const entries: Array<[string, any]> = [];
    value.forEach((mapValue: unknown, key: string) => {
      entries.push([key, mapValue]);
    });
    return entries;
  }
  if (value && typeof value === "object")
    return Object.entries(value as Record<string, any>);
  return [];
}

export function extractTableData(block: Y.Map<any>): string[][] | null {
  const rowsValue = block.get("prop:rows");
  const columnsValue = block.get("prop:columns");
  const cellsValue = block.get("prop:cells");

  let rowEntries = mapEntries(rowsValue)
    .map(([rowId, payload]) => ({
      rowId,
      order:
        payload &&
        typeof payload === "object" &&
        typeof (payload as any).order === "string"
          ? (payload as any).order
          : rowId,
    }))
    .sort((a, b) => a.order.localeCompare(b.order));

  let columnEntries = mapEntries(columnsValue)
    .map(([columnId, payload]) => ({
      columnId,
      order:
        payload &&
        typeof payload === "object" &&
        typeof (payload as any).order === "string"
          ? (payload as any).order
          : columnId,
    }))
    .sort((a, b) => a.order.localeCompare(b.order));

  let cells = new Map<string, string>();
  if (rowEntries.length === 0 || columnEntries.length === 0) {
    const flatRows = new Map<string, string>();
    const flatColumns = new Map<string, string>();
    const flatCells = new Map<string, string>();
    block.forEach((value: unknown, key: string) => {
      const rowMatch = key.match(/^prop:rows\.([^.]+)\.order$/);
      if (rowMatch) {
        flatRows.set(
          rowMatch[1],
          typeof value === "string" ? value : rowMatch[1],
        );
        return;
      }
      const colMatch = key.match(/^prop:columns\.([^.]+)\.order$/);
      if (colMatch) {
        flatColumns.set(
          colMatch[1],
          typeof value === "string" ? value : colMatch[1],
        );
        return;
      }
      const cellMatch = key.match(/^prop:cells\.([^.]+:[^.]+)\.text$/);
      if (cellMatch) {
        flatCells.set(cellMatch[1], richTextValueToString(value));
      }
    });
    if (flatRows.size > 0 && flatColumns.size > 0) {
      rowEntries = Array.from(flatRows.entries())
        .map(([rowId, order]) => ({ rowId, order }))
        .sort((a, b) => a.order.localeCompare(b.order));
      columnEntries = Array.from(flatColumns.entries())
        .map(([columnId, order]) => ({ columnId, order }))
        .sort((a, b) => a.order.localeCompare(b.order));
      cells = flatCells;
    }
  } else {
    for (const [cellKey, payload] of mapEntries(cellsValue)) {
      if (payload instanceof Y.Map) {
        cells.set(cellKey, richTextValueToString(payload.get("text")));
        continue;
      }
      if (payload && typeof payload === "object" && "text" in payload) {
        cells.set(cellKey, richTextValueToString((payload as any).text));
      }
    }
  }
  if (rowEntries.length === 0 || columnEntries.length === 0) return null;
  const tableData: string[][] = [];
  for (const { rowId } of rowEntries) {
    const row: string[] = [];
    for (const { columnId } of columnEntries)
      row.push(cells.get(`${rowId}:${columnId}`) ?? "");
    tableData.push(row);
  }
  return tableData;
}

export function collectDocForMarkdown(
  doc: Y.Doc,
  tagOptionsById: Map<string, WorkspaceTagOption> = new Map(),
): {
  title: string;
  tags: string[];
  rootBlockIds: string[];
  blocksById: Map<string, MarkdownRenderableBlock>;
} {
  const meta = doc.getMap("meta");
  const tags = resolveTagLabels(
    getStringArray(getTagArray(meta)),
    tagOptionsById,
  );
  const blocks = doc.getMap("blocks") as Y.Map<any>;
  const pageId = findBlockIdByFlavour(blocks, "affine:page");
  const noteId = findBlockIdByFlavour(blocks, "affine:note");
  const blocksById = new Map<string, MarkdownRenderableBlock>();
  const visited = new Set<string>();
  let title = "";
  const rootBlockIds: string[] = [];
  if (pageId) {
    const pageBlock = findBlockById(blocks, pageId);
    if (pageBlock) {
      title = asText(pageBlock.get("prop:title"));
      rootBlockIds.push(...childIdsFrom(pageBlock.get("sys:children")));
    }
  } else if (noteId) rootBlockIds.push(noteId);
  if (rootBlockIds.length === 0)
    for (const [id] of blocks) rootBlockIds.push(String(id));

  const visit = (blockId: string) => {
    if (visited.has(blockId)) return;
    visited.add(blockId);
    const block = findBlockById(blocks, blockId);
    if (!block) return;
    const childIds = childIdsFrom(block.get("sys:children"));
    const entry: MarkdownRenderableBlock = {
      id: blockId,
      parentId: asStringOrNull(block.get("sys:parent")),
      flavour: asStringOrNull(block.get("sys:flavour")),
      type: asStringOrNull(block.get("prop:type")),
      text: asText(block.get("prop:text")) || null,
      checked:
        typeof block.get("prop:checked") === "boolean"
          ? Boolean(block.get("prop:checked"))
          : null,
      language: asStringOrNull(block.get("prop:language")),
      childIds,
      url: asStringOrNull(block.get("prop:url")),
      sourceId: asStringOrNull(block.get("prop:sourceId")),
      caption: asStringOrNull(block.get("prop:caption")),
      tableData:
        block.get("sys:flavour") === "affine:table"
          ? extractTableData(block)
          : null,
    };
    blocksById.set(blockId, entry);
    for (const childId of childIds) visit(childId);
  };
  for (const rootId of rootBlockIds) visit(rootId);
  for (const [id] of blocks) visit(String(id));
  return { title, tags, rootBlockIds, blocksById };
}

export async function applyMarkdownOperationsInternal(parsed: {
  workspaceId: string;
  docId: string;
  operations: MarkdownOperation[];
  strict?: boolean;
  placement?: AppendPlacement;
  replaceExisting?: boolean;
}): Promise<{
  appendedCount: number;
  skippedCount: number;
  blockIds: string[];
}> {
  const strict = parsed.strict !== false;
  const replaceExisting = parsed.replaceExisting === true;
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, parsed.workspaceId);
    const doc = new Y.Doc();
    const snapshot = await loadDoc(socket, parsed.workspaceId, parsed.docId);
    if (!snapshot.missing)
      throw new Error(`Document ${parsed.docId} not found.`);
    Y.applyUpdate(doc, Buffer.from(snapshot.missing, "base64"));
    const prevSV = Y.encodeStateVector(doc);
    const blocks = doc.getMap("blocks") as Y.Map<any>;
    let anchorPlacement: AppendPlacement | undefined = parsed.placement;
    let lastInsertedBlockId: string | undefined;
    let replaceParentId: string | undefined;
    let skippedCount = 0;
    const blockIds: string[] = [];
    if (replaceExisting) {
      replaceParentId = ensureNoteBlock(blocks);
      const noteBlock = findBlockById(blocks, replaceParentId);
      if (!noteBlock) throw new Error("Unable to resolve note block.");
      const noteChildren = ensureChildrenArray(noteBlock);
      const descendantBlockIds = collectDescendantBlockIds(
        blocks,
        childIdsFrom(noteChildren),
      );
      for (const descendantId of descendantBlockIds)
        blocks.delete(descendantId);
      if (noteChildren.length > 0) noteChildren.delete(0, noteChildren.length);
    }
    for (const operation of parsed.operations) {
      const placement = lastInsertedBlockId
        ? { afterBlockId: lastInsertedBlockId }
        : replaceParentId
          ? { parentId: replaceParentId }
          : anchorPlacement;
      const appendInput = markdownOperationToAppendInput(
        operation,
        parsed.docId,
        parsed.workspaceId,
        strict,
        placement,
      );
      try {
        const normalized = normalizeAppendBlockInput(appendInput);
        const context = resolveInsertContext(blocks, normalized);
        const { blockId, block, extraBlocks } = createBlock(normalized);
        blocks.set(blockId, block);
        if (Array.isArray(extraBlocks))
          for (const extra of extraBlocks)
            blocks.set(extra.blockId, extra.block);
        if (context.insertIndex >= context.children.length)
          context.children.push([blockId]);
        else context.children.insert(context.insertIndex, [blockId]);
        blockIds.push(blockId);
        lastInsertedBlockId = blockId;
        if (!replaceParentId) anchorPlacement = { afterBlockId: blockId };
      } catch {
        skippedCount += 1;
      }
    }
    const delta = Y.encodeStateAsUpdate(doc, prevSV);
    await pushDocUpdate(
      socket,
      parsed.workspaceId,
      parsed.docId,
      Buffer.from(delta).toString("base64"),
    );
    return { appendedCount: blockIds.length, skippedCount, blockIds };
  } finally {
    socket.disconnect();
  }
}

export async function createDocInternal(
  parsed: CreateDocInput,
): Promise<CreateDocResult> {
  const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
  if (!workspaceId) throw new Error("workspaceId is required");
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  try {
    await joinWorkspace(socket, workspaceId);
    const docId = generateId();
    const title = parsed.title || "Untitled";
    const ydoc = new Y.Doc();
    const blocks = ydoc.getMap("blocks");
    const pageId = generateId();
    const page = new Y.Map();
    setSysFields(page, pageId, "affine:page");
    const titleText = new Y.Text();
    titleText.insert(0, title);
    page.set("prop:title", titleText);
    const children = new Y.Array();
    page.set("sys:children", children);
    blocks.set(pageId, page);
    const surfaceId = generateId();
    const surface = new Y.Map();
    setSysFields(surface, surfaceId, "affine:surface");
    surface.set("sys:parent", null);
    surface.set("sys:children", new Y.Array());
    const elements = new Y.Map<any>();
    elements.set("type", "$blocksuite:internal:native$");
    elements.set("value", new Y.Map<any>());
    surface.set("prop:elements", elements);
    blocks.set(surfaceId, surface);
    children.push([surfaceId]);
    const noteId = generateId();
    const note = new Y.Map();
    setSysFields(note, noteId, "affine:note");
    note.set("sys:parent", null);
    note.set("prop:displayMode", "both");
    note.set("prop:xywh", "[0,0,800,95]");
    note.set("prop:index", "a0");
    note.set("prop:hidden", false);
    const background = new Y.Map<any>();
    background.set("light", "#ffffff");
    background.set("dark", "#252525");
    note.set("prop:background", background);
    const noteChildren = new Y.Array();
    note.set("sys:children", noteChildren);
    blocks.set(noteId, note);
    children.push([noteId]);
    if (parsed.content) {
      const paraId = generateId();
      const para = new Y.Map();
      setSysFields(para, paraId, "affine:paragraph");
      para.set("sys:parent", null);
      para.set("sys:children", new Y.Array());
      para.set("prop:type", "text");
      const paragraphText = new Y.Text();
      paragraphText.insert(0, parsed.content);
      para.set("prop:text", paragraphText);
      blocks.set(paraId, para);
      noteChildren.push([paraId]);
    }
    const meta = ydoc.getMap("meta");
    meta.set("id", docId);
    meta.set("title", title);
    meta.set("createDate", Date.now());
    meta.set("tags", new Y.Array());
    const updateFull = Y.encodeStateAsUpdate(ydoc);
    await pushDocUpdate(
      socket,
      workspaceId,
      docId,
      Buffer.from(updateFull).toString("base64"),
    );
    const wsDoc = new Y.Doc();
    const snapshot = await loadDoc(socket, workspaceId, workspaceId);
    if (snapshot.missing)
      Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, "base64"));
    const prevSV = Y.encodeStateVector(wsDoc);
    const wsMeta = wsDoc.getMap("meta");
    let pages = wsMeta.get("pages") as Y.Array<Y.Map<any>> | undefined;
    if (!pages) {
      pages = new Y.Array();
      wsMeta.set("pages", pages);
    }
    const entry = new Y.Map();
    entry.set("id", docId);
    entry.set("title", title);
    entry.set("createDate", Date.now());
    entry.set("tags", new Y.Array());
    pages.push([entry as any]);
    const wsDelta = Y.encodeStateAsUpdate(wsDoc, prevSV);
    await pushDocUpdate(
      socket,
      workspaceId,
      workspaceId,
      Buffer.from(wsDelta).toString("base64"),
    );
    return { workspaceId, docId, title };
  } finally {
    socket.disconnect();
  }
}

export async function createDocFromMarkdownCore(parsed: {
  workspaceId?: string;
  title?: string;
  markdown: string;
  strict?: boolean;
  parentDocId?: string;
}) {
  const parsedMarkdown = parseMarkdownToOperations(parsed.markdown);
  let operations = [...parsedMarkdown.operations];
  let title = (parsed.title ?? "").trim();
  if (!title && operations.length > 0) {
    const first = operations[0];
    if (first.type === "heading" && first.level === 1) {
      title = first.text.trim() || "Untitled";
      operations = operations.slice(1);
    }
  }
  if (!title) {
    title = "Untitled";
  }

  const created = await createDocInternal({
    workspaceId: parsed.workspaceId,
    title,
  });

  let applied = {
    appendedCount: 0,
    skippedCount: 0,
    blockIds: [] as string[],
  };

  if (operations.length > 0) {
    applied = await applyMarkdownOperationsInternal({
      workspaceId: created.workspaceId,
      docId: created.docId,
      operations,
      strict: parsed.strict,
    });
  }

  let linkedToParent = false;
  if (parsed.parentDocId) {
    try {
      await appendBlockInternal({
        workspaceId: created.workspaceId,
        docId: parsed.parentDocId,
        type: "embed_linked_doc",
        pageId: created.docId,
      });
      linkedToParent = true;
    } catch {
      // Non-fatal
    }
  }

  const applyWarnings: string[] = [];
  if (applied.skippedCount > 0) {
    applyWarnings.push(
      `${applied.skippedCount} markdown block(s) could not be applied to AFFiNE and were skipped.`,
    );
  }
  if (parsed.parentDocId && !linkedToParent) {
    applyWarnings.push(
      `Doc created but could not be linked to parent doc "${parsed.parentDocId}". Link it manually.`,
    );
  }

  return {
    workspaceId: created.workspaceId,
    docId: created.docId,
    title: created.title,
    linkedToParent,
    warnings: mergeWarnings(parsedMarkdown.warnings, applyWarnings),
    lossy: parsedMarkdown.lossy || applied.skippedCount > 0,
    stats: {
      parsedBlocks: parsedMarkdown.operations.length,
      appliedBlocks: applied.appendedCount,
      skippedBlocks: applied.skippedCount,
    },
  };
}

export type DatabaseColumnDef = {
  id: string;
  name: string;
  type: string;
  options: Array<{ id: string; value: string; color: string }>;
  raw: any;
};

export type DatabaseViewColumnDef = {
  id: string;
  name: string | null;
  hidden: boolean;
  width: number | null;
};

export type DatabaseViewDef = {
  id: string;
  name: string;
  mode: string;
  columns: DatabaseViewColumnDef[];
  columnIds: string[];
  groupBy: {
    columnId: string | null;
    name: string | null;
    type: string | null;
  } | null;
  header: {
    titleColumn: string | null;
    iconColumn: string | null;
  };
};

export type DatabaseColumnLookup = {
  columnDefs: DatabaseColumnDef[];
  colById: Map<string, DatabaseColumnDef>;
  colByName: Map<string, DatabaseColumnDef>;
  colByNameLower: Map<string, DatabaseColumnDef>;
  titleCol: DatabaseColumnDef | null;
};

export type DatabaseDocContext = DatabaseColumnLookup & {
  socket: Awaited<ReturnType<typeof connectWorkspaceSocket>>;
  doc: Y.Doc;
  prevSV: Uint8Array;
  blocks: Y.Map<any>;
  dbBlock: Y.Map<any>;
  cellsMap: Y.Map<any>;
};

export function readColumnDefs(dbBlock: Y.Map<any>): DatabaseColumnDef[] {
  const columnsRaw = dbBlock.get("prop:columns");
  const defs: DatabaseColumnDef[] = [];
  if (!(columnsRaw instanceof Y.Array)) return defs;
  columnsRaw.forEach((col: any) => {
    const id = col instanceof Y.Map ? col.get("id") : col?.id;
    const name = col instanceof Y.Map ? col.get("name") : col?.name;
    const type = col instanceof Y.Map ? col.get("type") : col?.type;
    const data = col instanceof Y.Map ? col.get("data") : col?.data;
    let options: Array<{ id: string; value: string; color: string }> = [];
    if (data) {
      const rawOpts =
        data instanceof Y.Map ? data.get("options") : data?.options;
      if (Array.isArray(rawOpts)) {
        options = rawOpts.map((o: any) => ({
          id: String(o?.id ?? o?.get?.("id") ?? ""),
          value: String(o?.value ?? o?.get?.("value") ?? ""),
          color: String(o?.color ?? o?.get?.("color") ?? ""),
        }));
      } else if (rawOpts instanceof Y.Array) {
        rawOpts.forEach((o: any) => {
          options.push({
            id: String(o instanceof Y.Map ? o.get("id") : (o?.id ?? "")),
            value: String(
              o instanceof Y.Map ? o.get("value") : (o?.value ?? ""),
            ),
            color: String(
              o instanceof Y.Map ? o.get("color") : (o?.color ?? ""),
            ),
          });
        });
      }
    }
    if (id)
      defs.push({
        id: String(id),
        name: String(name || ""),
        type: String(type || "rich-text"),
        options,
        raw: col,
      });
  });
  return defs;
}

export function readDatabaseViewDefs(
  dbBlock: Y.Map<any>,
  lookup: DatabaseColumnLookup,
): DatabaseViewDef[] {
  const viewsRaw = dbBlock.get("prop:views");
  const views: DatabaseViewDef[] = [];
  if (!(viewsRaw instanceof Y.Array)) return views;
  viewsRaw.forEach((view: any) => {
    const id = view instanceof Y.Map ? view.get("id") : view?.id;
    if (!id) return;
    const columnsRaw =
      view instanceof Y.Map ? view.get("columns") : view?.columns;
    const headerRaw = view instanceof Y.Map ? view.get("header") : view?.header;
    const groupByRaw =
      view instanceof Y.Map ? view.get("groupBy") : view?.groupBy;
    const columns: DatabaseViewColumnDef[] = databaseArrayValues(columnsRaw)
      .map((entry: any) => {
        const columnId = entry instanceof Y.Map ? entry.get("id") : entry?.id;
        if (!columnId || typeof columnId !== "string") return null;
        const columnDef = lookup.colById.get(columnId) || null;
        const hidden = entry instanceof Y.Map ? entry.get("hide") : entry?.hide;
        const width =
          entry instanceof Y.Map ? entry.get("width") : entry?.width;
        return {
          id: columnId,
          name: columnDef?.name || null,
          hidden: hidden === true,
          width: typeof width === "number" ? width : null,
        };
      })
      .filter((entry): entry is DatabaseViewColumnDef => entry !== null);
    views.push({
      id: String(id),
      name: String(
        (view instanceof Y.Map ? view.get("name") : view?.name) || "",
      ),
      mode: String(
        (view instanceof Y.Map ? view.get("mode") : view?.mode) || "",
      ),
      columns,
      columnIds: columns.map((column) => column.id),
      groupBy: groupByRaw
        ? {
            columnId:
              typeof (groupByRaw as any)?.columnId === "string"
                ? (groupByRaw as any).columnId
                : null,
            name:
              typeof (groupByRaw as any)?.name === "string"
                ? (groupByRaw as any).name
                : null,
            type:
              typeof (groupByRaw as any)?.type === "string"
                ? (groupByRaw as any).type
                : null,
          }
        : null,
      header: {
        titleColumn:
          typeof (headerRaw as any)?.titleColumn === "string"
            ? (headerRaw as any).titleColumn
            : null,
        iconColumn:
          typeof (headerRaw as any)?.iconColumn === "string"
            ? (headerRaw as any).iconColumn
            : null,
      },
    });
  });
  return views;
}

export function isTitleAliasKey(value: string): boolean {
  return value.trim().toLowerCase() === "title";
}

export function buildDatabaseColumnLookup(
  columnDefs: DatabaseColumnDef[],
): DatabaseColumnLookup {
  const colById = new Map<string, DatabaseColumnDef>();
  const colByName = new Map<string, DatabaseColumnDef>();
  const colByNameLower = new Map<string, DatabaseColumnDef>();
  let titleCol: DatabaseColumnDef | null = null;
  for (const col of columnDefs) {
    colById.set(col.id, col);
    if (col.name) {
      colByName.set(col.name, col);
      colByNameLower.set(col.name.trim().toLowerCase(), col);
    }
    if (!titleCol && col.type === "title") titleCol = col;
  }
  return { columnDefs, colById, colByName, colByNameLower, titleCol };
}

export function findDatabaseColumn(
  key: string,
  lookup: DatabaseColumnLookup,
): DatabaseColumnDef | null {
  return (
    lookup.colByName.get(key) ||
    lookup.colById.get(key) ||
    lookup.colByNameLower.get(key.trim().toLowerCase()) ||
    null
  );
}

export function availableDatabaseColumns(lookup: DatabaseColumnLookup): string {
  return ["title", ...lookup.columnDefs.map((col) => col.name || col.id)].join(
    ", ",
  );
}

export function getDatabaseRowIds(dbBlock: Y.Map<any>): string[] {
  return childIdsFrom(dbBlock.get("sys:children"));
}

export function readDatabaseRowTitle(rowBlock: Y.Map<any>): string {
  return asText(rowBlock.get("prop:text"));
}

export function resolveDatabaseTitleValue(
  cells: Record<string, unknown>,
  lookup: DatabaseColumnLookup,
): string {
  if (lookup.titleCol) {
    const value = cells[lookup.titleCol.name] ?? cells[lookup.titleCol.id];
    if (value !== undefined) return String(value ?? "");
  }
  for (const [key, value] of Object.entries(cells)) {
    if (isTitleAliasKey(key)) return String(value ?? "");
  }
  const namedTitleColumn = lookup.colByNameLower.get("title");
  if (namedTitleColumn) {
    const value = cells[namedTitleColumn.name] ?? cells[namedTitleColumn.id];
    if (value !== undefined) return String(value ?? "");
  }
  return "";
}

export function ensureDatabaseRowCells(
  cellsMap: Y.Map<any>,
  rowBlockId: string,
): Y.Map<any> {
  const existing = cellsMap.get(rowBlockId);
  if (existing instanceof Y.Map) return existing;
  const rowCells = new Y.Map<any>();
  cellsMap.set(rowBlockId, rowCells);
  return rowCells;
}

export function getDatabaseRowBlock(
  blocks: Y.Map<any>,
  dbBlock: Y.Map<any>,
  databaseBlockId: string,
  rowBlockId: string,
): Y.Map<any> {
  const rowBlock = findBlockById(blocks, rowBlockId);
  if (!rowBlock) throw new Error(`Row block '${rowBlockId}' not found`);
  const parentId = rowBlock.get("sys:parent");
  const isDatabaseChild = getDatabaseRowIds(dbBlock).includes(rowBlockId);
  if (parentId !== databaseBlockId && !isDatabaseChild)
    throw new Error(
      `Row block '${rowBlockId}' does not belong to database '${databaseBlockId}'`,
    );
  if (rowBlock.get("sys:flavour") !== "affine:paragraph")
    throw new Error(
      `Row block '${rowBlockId}' is not a database row paragraph`,
    );
  return rowBlock;
}

export function databaseArrayValues(value: unknown): unknown[] {
  if (value instanceof Y.Array) {
    const entries: unknown[] = [];
    value.forEach((entry) => {
      entries.push(entry);
    });
    return entries;
  }
  if (Array.isArray(value)) return value;
  return [];
}

export function resolveSelectOptionId(
  col: {
    name: string;
    raw: any;
    options: Array<{ id: string; value: string; color: string }>;
  },
  valueText: string,
  createOption: boolean = true,
): string {
  const existing = col.options.find((o) => o.value === valueText);
  if (existing) return existing.id;
  if (!createOption)
    throw new Error(`Column "${col.name}": option "${valueText}" not found`);
  const newId = generateId();
  const colorIdx = col.options.length % SELECT_COLORS.length;
  const newOpt = {
    id: newId,
    value: valueText,
    color: SELECT_COLORS[colorIdx],
  };
  col.options.push(newOpt);
  const rawCol = col.raw;
  if (rawCol instanceof Y.Map) {
    let data = rawCol.get("data");
    if (!(data instanceof Y.Map)) {
      data = new Y.Map<any>();
      rawCol.set("data", data);
    }
    let opts = data.get("options");
    if (!(opts instanceof Y.Array)) {
      opts = new Y.Array<any>();
      data.set("options", opts);
    }
    const optMap = new Y.Map<any>();
    optMap.set("id", newId);
    optMap.set("value", valueText);
    optMap.set("color", SELECT_COLORS[colorIdx]);
    opts.push([optMap]);
  }
  return newId;
}

export function decodeDatabaseCellValue(
  col: DatabaseColumnDef,
  cellEntry: unknown,
): Record<string, unknown> {
  const rawValue =
    cellEntry instanceof Y.Map
      ? cellEntry.get("value")
      : (cellEntry as any)?.value;
  const base: Record<string, unknown> = { columnId: col.id, type: col.type };
  switch (col.type) {
    case "rich-text":
    case "title":
      return { ...base, value: richTextValueToString(rawValue) || null };
    case "select": {
      const optionId = asStringOrNull(rawValue);
      const option = col.options.find((entry) => entry.id === optionId) || null;
      return {
        ...base,
        value: option?.value ?? optionId ?? null,
        optionId: optionId ?? null,
      };
    }
    case "multi-select": {
      const optionIds = databaseArrayValues(rawValue).map((entry) =>
        String(entry),
      );
      const values = optionIds.map(
        (optionId) =>
          col.options.find((entry) => entry.id === optionId)?.value ?? optionId,
      );
      return { ...base, value: values, optionIds };
    }
    case "number": {
      const numericValue =
        typeof rawValue === "number" ? rawValue : Number(rawValue);
      return {
        ...base,
        value: Number.isFinite(numericValue) ? numericValue : null,
      };
    }
    case "checkbox":
      return {
        ...base,
        value: typeof rawValue === "boolean" ? rawValue : !!rawValue,
      };
    case "date": {
      const numericValue =
        typeof rawValue === "number" ? rawValue : Number(rawValue);
      return {
        ...base,
        value: Number.isFinite(numericValue) ? numericValue : null,
      };
    }
    case "link":
      return { ...base, value: rawValue == null ? null : String(rawValue) };
    default:
      return {
        ...base,
        value:
          typeof rawValue === "string" ||
          rawValue instanceof Y.Text ||
          Array.isArray(rawValue)
            ? richTextValueToString(rawValue)
            : (rawValue ?? null),
      };
  }
}

export function writeDatabaseCellValue(
  rowCells: Y.Map<any>,
  col: DatabaseColumnDef,
  value: unknown,
  createOption: boolean,
) {
  const cellValue = new Y.Map<any>();
  cellValue.set("columnId", col.id);
  switch (col.type) {
    case "rich-text":
    case "title":
      cellValue.set("value", makeText(String(value ?? "")));
      break;
    case "number": {
      const num = Number(value);
      if (Number.isNaN(num))
        throw new Error(
          `Column "${col.name}": expected a number, got ${JSON.stringify(value)}`,
        );
      cellValue.set("value", num);
      break;
    }
    case "checkbox": {
      let bool: boolean;
      if (typeof value === "boolean") bool = value;
      else if (typeof value === "string") {
        const lower = value.toLowerCase().trim();
        bool = lower === "true" || lower === "1" || lower === "yes";
      } else bool = !!value;
      cellValue.set("value", bool);
      break;
    }
    case "select":
      cellValue.set(
        "value",
        resolveSelectOptionId(col, String(value ?? ""), createOption),
      );
      break;
    case "multi-select": {
      const labels = Array.isArray(value)
        ? value.map(String)
        : [String(value ?? "")];
      const optionIds = new Y.Array<string>();
      optionIds.push(
        labels.map((label) => resolveSelectOptionId(col, label, createOption)),
      );
      cellValue.set("value", optionIds);
      break;
    }
    case "date": {
      const numericValue =
        typeof value === "number"
          ? value
          : Number.isNaN(Number(value))
            ? Date.parse(String(value))
            : Number(value);
      if (!Number.isFinite(numericValue))
        throw new Error(
          `Column "${col.name}": expected a timestamp-compatible value, got ${JSON.stringify(value)}`,
        );
      cellValue.set("value", numericValue);
      break;
    }
    case "link":
      cellValue.set("value", String(value ?? ""));
      break;
    default:
      if (typeof value === "string") cellValue.set("value", makeText(value));
      else cellValue.set("value", value);
  }
  rowCells.set(col.id, cellValue);
}

export async function loadDatabaseDocContext(
  workspaceId: string,
  docId: string,
  databaseBlockId: string,
): Promise<DatabaseDocContext> {
  const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
  const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
  const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
  await joinWorkspace(socket, workspaceId);
  const doc = new Y.Doc();
  const snapshot = await loadDoc(socket, workspaceId, docId);
  if (!snapshot.missing) {
    socket.disconnect();
    throw new Error("Document not found");
  }
  Y.applyUpdate(doc, Buffer.from(snapshot.missing, "base64"));
  const prevSV = Y.encodeStateVector(doc);
  const blocks = doc.getMap("blocks") as Y.Map<any>;
  const dbBlock = findBlockById(blocks, databaseBlockId);
  if (!dbBlock) {
    socket.disconnect();
    throw new Error(`Database block '${databaseBlockId}' not found`);
  }
  const dbFlavour = dbBlock.get("sys:flavour");
  if (dbFlavour !== "affine:database") {
    socket.disconnect();
    throw new Error(
      `Block '${databaseBlockId}' is not a database (flavour: ${dbFlavour})`,
    );
  }
  const cellsMap = dbBlock.get("prop:cells") as Y.Map<any>;
  if (!(cellsMap instanceof Y.Map)) {
    socket.disconnect();
    throw new Error("Database block has no cells map");
  }
  const lookup = buildDatabaseColumnLookup(readColumnDefs(dbBlock));
  return { socket, doc, prevSV, blocks, dbBlock, cellsMap, ...lookup };
}
