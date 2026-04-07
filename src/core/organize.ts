import { randomBytes } from 'node:crypto';
import { getDefaultWorkspaceId } from './utils.js';
import { createGraphQLClient } from '../graphqlClient.js';
import {
	connectWorkspaceSocket,
	joinWorkspace,
	loadDoc,
	pushDocUpdate,
	wsUrlFromGraphQLEndpoint
} from '../client/ws.js';
import * as Y from 'yjs';
import { generateKeyBetween } from 'fractional-indexing';

/**
 * 工具函数类型定义
 */
type CollectionInfo = {
	id: string;
	name: string;
	rules: {
		filters: unknown[];
	};
	allowList: string[];
};

type OrganizeNodeRecord = {
	id: string;
	parentId: string | null;
	type: 'folder' | 'doc' | 'tag' | 'collection';
	data: string;
	index: string;
};

/**
 * 生成 ID
 */
function generateId(length = 21): string {
	const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
	const bytes = randomBytes(length);
	let result = '';
	for (let i = 0; i < length; i += 1) {
		result += chars[bytes[i]! % chars.length];
	}
	return result;
}

function hasSamePrefix(a: string, b: string): boolean {
	return a.startsWith(b) || b.startsWith(a);
}

function generateFractionalIndexingKeyBetween(a: string | null, b: string | null): string {
	const randomSize = 32;

	function postfix(length = randomSize): string {
		const chars = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
		const values = randomBytes(length);
		let result = '';
		for (let i = 0; i < length; i += 1) {
			result += chars[values[i]! % chars.length];
		}
		return result;
	}

	function subkey(key: string | null): string | null {
		if (key === null) {
			return null;
		}
		if (key.length <= randomSize + 1) {
			return key;
		}
		return key.substring(0, key.length - randomSize - 1);
	}

	const aSubkey = subkey(a);
	const bSubkey = subkey(b);

	if (aSubkey === null && bSubkey === null) {
		return generateKeyBetween(null, null) + '0' + postfix();
	}
	if (aSubkey === null && bSubkey !== null) {
		return generateKeyBetween(null, bSubkey) + '0' + postfix();
	}
	if (bSubkey === null && aSubkey !== null) {
		return generateKeyBetween(aSubkey, null) + '0' + postfix();
	}
	if (aSubkey !== null && bSubkey !== null) {
		if (hasSamePrefix(aSubkey, bSubkey) && a !== null && b !== null) {
			return generateKeyBetween(a, b) + '0' + postfix();
		}
		return generateKeyBetween(aSubkey, bSubkey) + '0' + postfix();
	}
	throw new Error('Unreachable fractional indexing state');
}

function normalizeCollection(value: unknown): CollectionInfo | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	const collection = value as Record<string, unknown>;
	if (typeof collection.id !== 'string' || typeof collection.name !== 'string') {
		return null;
	}
	const allowList = Array.isArray(collection.allowList)
		? collection.allowList.filter((entry): entry is string => typeof entry === 'string')
		: [];
	const rules =
		collection.rules &&
		typeof collection.rules === 'object' &&
		!Array.isArray(collection.rules) &&
		Array.isArray((collection.rules as Record<string, unknown>).filters)
			? {
					filters: (
						(collection.rules as Record<string, unknown>).filters as unknown[]
					).slice()
				}
			: { filters: [] };

	return {
		id: collection.id,
		name: collection.name,
		rules,
		allowList
	};
}

function normalizeOrganizeNode(value: unknown): OrganizeNodeRecord | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	const raw = value as Record<string, unknown>;
	if (
		typeof raw.id !== 'string' ||
		typeof raw.type !== 'string' ||
		typeof raw.data !== 'string' ||
		typeof raw.index !== 'string'
	) {
		return null;
	}
	if (!['folder', 'doc', 'tag', 'collection'].includes(raw.type)) {
		return null;
	}
	return {
		id: raw.id,
		parentId:
			raw.parentId === null || typeof raw.parentId === 'string'
				? (raw.parentId as string | null)
				: null,
		type: raw.type as OrganizeNodeRecord['type'],
		data: raw.data,
		index: raw.index
	};
}

function specialWorkspaceDbDocId(workspaceId: string, tableName: string): string {
	return `db$${workspaceId}$${tableName}`;
}

function isDeletedRecord(record: Y.Map<any>): boolean {
	return record.get('$$DELETED') === true || record.size === 0;
}

function ensureRecord(doc: Y.Doc, id: string): Y.Map<any> {
	return doc.getMap(id);
}

function deleteRecord(record: Y.Map<any>, keepId = true): void {
	const keys = Array.from(record.keys());
	for (const key of keys) {
		if (keepId && key === 'id') {
			continue;
		}
		record.delete(key);
	}
	record.set('$$DELETED', true);
}

function readCollections(array: Y.Array<any>): CollectionInfo[] {
	const collections: CollectionInfo[] = [];
	for (let i = 0; i < array.length; i += 1) {
		const normalized = normalizeCollection(array.get(i));
		if (normalized) {
			collections.push(normalized);
		}
	}
	return collections;
}

function findCollectionIndex(array: Y.Array<any>, id: string): number {
	for (let i = 0; i < array.length; i += 1) {
		const normalized = normalizeCollection(array.get(i));
		if (normalized?.id === id) {
			return i;
		}
	}
	return -1;
}

function readOrganizeNodes(doc: Y.Doc): OrganizeNodeRecord[] {
	const nodes: OrganizeNodeRecord[] = [];
	for (const key of doc.share.keys()) {
		if (!doc.share.has(key)) {
			continue;
		}
		const record = doc.getMap(key);
		if (!(record instanceof Y.Map) || isDeletedRecord(record)) {
			continue;
		}
		const normalized = normalizeOrganizeNode(record.toJSON());
		if (normalized) {
			nodes.push(normalized);
		}
	}
	return nodes;
}

function organizeNodeMap(nodes: OrganizeNodeRecord[]): Map<string, OrganizeNodeRecord> {
	return new Map(nodes.map((node) => [node.id, node] as const));
}

function sortOrganizeNodes(nodes: OrganizeNodeRecord[]): OrganizeNodeRecord[] {
	return [...nodes].sort((left, right) => {
		const parentCompare = (left.parentId ?? '').localeCompare(right.parentId ?? '');
		if (parentCompare !== 0) {
			return parentCompare;
		}
		const indexCompare = left.index.localeCompare(right.index);
		if (indexCompare !== 0) {
			return indexCompare;
		}
		return left.id.localeCompare(right.id);
	});
}

function ensureFolderParent(nodes: Map<string, OrganizeNodeRecord>, parentId: string | null): void {
	if (parentId === null) {
		return;
	}
	const parent = nodes.get(parentId);
	if (!parent || parent.type !== 'folder') {
		throw new Error(`Parent folder '${parentId}' was not found.`);
	}
}

function ensureNodeIsFolder(
	nodes: Map<string, OrganizeNodeRecord>,
	nodeId: string
): OrganizeNodeRecord {
	const node = nodes.get(nodeId);
	if (!node || node.type !== 'folder') {
		throw new Error(`Folder '${nodeId}' was not found.`);
	}
	return node;
}

function isAncestor(
	nodes: Map<string, OrganizeNodeRecord>,
	childId: string,
	ancestorId: string
): boolean {
	if (childId === ancestorId) {
		return false;
	}
	const seen = new Set<string>([childId]);
	let current = childId;
	while (true) {
		const node = nodes.get(current);
		if (!node?.parentId) {
			return false;
		}
		current = node.parentId;
		if (seen.has(current)) {
			return false;
		}
		seen.add(current);
		if (current === ancestorId) {
			return true;
		}
	}
}

function nextOrganizeIndex(nodes: OrganizeNodeRecord[], parentId: string | null): string {
	const siblings = nodes
		.filter((node) => node.parentId === parentId)
		.sort((left, right) => left.index.localeCompare(right.index));
	const last = siblings.at(-1);
	return generateFractionalIndexingKeyBetween(last?.index ?? null, null);
}

function requireWorkspaceId(workspaceId?: string): string {
	const resolved = workspaceId || getDefaultWorkspaceId();
	if (!resolved) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	return resolved;
}

async function getSocketContext() {
	const gql = await createGraphQLClient();
	const endpoint = gql.endpoint;
	const cookie = gql.cookie;
	const bearer = gql.bearer;
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	return { socket };
}

async function loadWorkspaceRootDoc(socket: any, workspaceId: string) {
	const snapshot = await loadDoc(socket, workspaceId, workspaceId);
	const doc = new Y.Doc();
	if (snapshot.missing) {
		Y.applyUpdate(doc, Buffer.from(snapshot.missing, 'base64'));
	}
	return { doc, snapshot };
}

async function saveWorkspaceRootDoc(socket: any, workspaceId: string, doc: Y.Doc) {
	const update = Y.encodeStateAsUpdate(doc);
	await pushDocUpdate(socket, workspaceId, workspaceId, Buffer.from(update).toString('base64'));
}

async function loadFoldersDoc(socket: any, workspaceId: string) {
	const docId = specialWorkspaceDbDocId(workspaceId, 'folders');
	const snapshot = await loadDoc(socket, workspaceId, docId);
	const doc = new Y.Doc();
	if (snapshot.missing) {
		Y.applyUpdate(doc, Buffer.from(snapshot.missing, 'base64'));
	}
	return { docId, doc, snapshot };
}

async function saveFoldersDoc(socket: any, workspaceId: string, docId: string, doc: Y.Doc) {
	const update = Y.encodeStateAsUpdate(doc);
	await pushDocUpdate(socket, workspaceId, docId, Buffer.from(update).toString('base64'));
}

/**
 * 列出收藏集
 */
export async function listCollectionsHandler(params: { workspaceId?: string }) {
	const { workspaceId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		const collections = current instanceof Y.Array ? readCollections(current) : [];
		return [...collections].sort((left, right) => left.name.localeCompare(right.name));
	} finally {
		socket.disconnect();
	}
}

/**
 * 获取收藏集
 */
export async function getCollectionHandler(params: { workspaceId?: string; collectionId: string }) {
	const { workspaceId, collectionId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		const collections = current instanceof Y.Array ? readCollections(current) : [];
		const collection = collections.find((entry) => entry.id === collectionId);
		if (!collection) {
			throw new Error(`Collection '${collectionId}' was not found.`);
		}
		return collection;
	} finally {
		socket.disconnect();
	}
}

/**
 * 创建收藏集
 */
export async function createCollectionHandler(params: { workspaceId?: string; name: string }) {
	const { workspaceId, name } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		let current = setting.get('collections') as Y.Array<any> | undefined;
		if (!(current instanceof Y.Array)) {
			current = new Y.Array<any>();
			setting.set('collections', current);
		}

		const collection: CollectionInfo = {
			id: generateId(),
			name,
			rules: {
				filters: []
			},
			allowList: []
		};

		current.push([collection]);
		await saveWorkspaceRootDoc(socket, resolvedWorkspaceId, doc);
		return collection;
	} finally {
		socket.disconnect();
	}
}

/**
 * 更新收藏集
 */
export async function updateCollectionHandler(params: {
	workspaceId?: string;
	collectionId: string;
	name?: string;
}) {
	const { workspaceId, collectionId, name } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		if (!(current instanceof Y.Array)) {
			throw new Error('Workspace does not contain any collections.');
		}
		const index = findCollectionIndex(current, collectionId);
		if (index < 0) {
			throw new Error(`Collection '${collectionId}' was not found.`);
		}

		const previous = normalizeCollection(current.get(index));
		if (!previous) {
			throw new Error(`Collection '${collectionId}' is malformed.`);
		}
		const next: CollectionInfo = {
			...previous,
			name: name ?? previous.name
		};

		doc.transact(() => {
			current.delete(index, 1);
			current.insert(index, [next]);
		});

		await saveWorkspaceRootDoc(socket, resolvedWorkspaceId, doc);
		return next;
	} finally {
		socket.disconnect();
	}
}

/**
 * 删除收藏集
 */
export async function deleteCollectionHandler(params: {
	workspaceId?: string;
	collectionId: string;
}) {
	const { workspaceId, collectionId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		if (!(current instanceof Y.Array)) {
			throw new Error('Workspace does not contain any collections.');
		}
		const index = findCollectionIndex(current, collectionId);
		if (index < 0) {
			throw new Error(`Collection '${collectionId}' was not found.`);
		}
		current.delete(index, 1);
		await saveWorkspaceRootDoc(socket, resolvedWorkspaceId, doc);
		return { success: true, collectionId };
	} finally {
		socket.disconnect();
	}
}

/**
 * 添加文档到收藏集
 */
export async function addDocToCollectionHandler(params: {
	workspaceId?: string;
	collectionId: string;
	docId: string;
}) {
	const { workspaceId, collectionId, docId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		if (!(current instanceof Y.Array)) {
			throw new Error('Workspace does not contain any collections.');
		}
		const index = findCollectionIndex(current, collectionId);
		if (index < 0) {
			throw new Error(`Collection '${collectionId}' was not found.`);
		}
		const previous = normalizeCollection(current.get(index));
		if (!previous) {
			throw new Error(`Collection '${collectionId}' is malformed.`);
		}
		const next: CollectionInfo = {
			...previous,
			allowList: Array.from(new Set([...previous.allowList, docId]))
		};
		doc.transact(() => {
			current.delete(index, 1);
			current.insert(index, [next]);
		});
		await saveWorkspaceRootDoc(socket, resolvedWorkspaceId, doc);
		return next;
	} finally {
		socket.disconnect();
	}
}

/**
 * 从收藏集移除文档
 */
export async function removeDocFromCollectionHandler(params: {
	workspaceId?: string;
	collectionId: string;
	docId: string;
}) {
	const { workspaceId, collectionId, docId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { doc } = await loadWorkspaceRootDoc(socket, resolvedWorkspaceId);
		const setting = doc.getMap('setting');
		const current = setting.get('collections');
		if (!(current instanceof Y.Array)) {
			throw new Error('Workspace does not contain any collections.');
		}
		const index = findCollectionIndex(current, collectionId);
		if (index < 0) {
			throw new Error(`Collection '${collectionId}' was not found.`);
		}
		const previous = normalizeCollection(current.get(index));
		if (!previous) {
			throw new Error(`Collection '${collectionId}' is malformed.`);
		}
		const next: CollectionInfo = {
			...previous,
			allowList: previous.allowList.filter((id) => id !== docId)
		};
		doc.transact(() => {
			current.delete(index, 1);
			current.insert(index, [next]);
		});
		await saveWorkspaceRootDoc(socket, resolvedWorkspaceId, doc);
		return next;
	} finally {
		socket.disconnect();
	}
}

/**
 * 列出组织节点
 */
export async function listOrganizeNodesHandler(params: { workspaceId?: string }) {
	const { workspaceId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodes = sortOrganizeNodes(readOrganizeNodes(doc));
		return {
			workspaceId: resolvedWorkspaceId,
			storageDocId: docId,
			nodes
		};
	} finally {
		socket.disconnect();
	}
}

/**
 * 创建文件夹
 */
export async function createFolderHandler(params: {
	workspaceId?: string;
	name: string;
	parentId?: string | null;
	index?: string;
}) {
	const { workspaceId, name, parentId, index } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const resolvedParentId = parentId ?? null;
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodes = readOrganizeNodes(doc);
		const nodeMap = organizeNodeMap(nodes);
		ensureFolderParent(nodeMap, resolvedParentId);
		const folderId = generateId();
		const folderIndex = index ?? nextOrganizeIndex(nodes, resolvedParentId);
		const record = ensureRecord(doc, folderId);
		record.set('id', folderId);
		record.set('type', 'folder');
		record.set('data', name);
		record.set('parentId', resolvedParentId);
		record.set('index', folderIndex);
		record.delete('$$DELETED');
		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return {
			id: folderId,
			parentId: resolvedParentId,
			type: 'folder',
			data: name,
			index: folderIndex,
			storageDocId: docId
		};
	} finally {
		socket.disconnect();
	}
}

/**
 * 重命名文件夹
 */
export async function renameFolderHandler(params: {
	workspaceId?: string;
	folderId: string;
	name: string;
}) {
	const { workspaceId, folderId, name } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodeMap = organizeNodeMap(readOrganizeNodes(doc));
		ensureNodeIsFolder(nodeMap, folderId);
		const record = ensureRecord(doc, folderId);
		record.set('data', name);
		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return { id: folderId, name };
	} finally {
		socket.disconnect();
	}
}

/**
 * 删除文件夹
 */
export async function deleteFolderHandler(params: { workspaceId?: string; folderId: string }) {
	const { workspaceId, folderId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodes = readOrganizeNodes(doc);
		const nodeMap = organizeNodeMap(nodes);
		ensureNodeIsFolder(nodeMap, folderId);

		const stack = [folderId];
		const deletedIds: string[] = [];
		while (stack.length > 0) {
			const currentId = stack.pop()!;
			const current = nodeMap.get(currentId);
			if (!current) {
				continue;
			}
			if (current.type === 'folder') {
				const children = nodes.filter((node) => node.parentId === current.id);
				for (const child of children) {
					stack.push(child.id);
				}
			}
			deleteRecord(ensureRecord(doc, currentId));
			deletedIds.push(currentId);
		}

		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return { success: true, deletedIds };
	} finally {
		socket.disconnect();
	}
}

/**
 * 移动组织节点
 */
export async function moveOrganizeNodeHandler(params: {
	workspaceId?: string;
	nodeId: string;
	parentId?: string | null;
	index?: string;
}) {
	const { workspaceId, nodeId, parentId, index } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const resolvedParentId = parentId ?? null;
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodes = readOrganizeNodes(doc);
		const nodeMap = organizeNodeMap(nodes);
		const node = nodeMap.get(nodeId);
		if (!node) {
			throw new Error(`Organize node '${nodeId}' was not found.`);
		}
		ensureFolderParent(nodeMap, resolvedParentId);
		if (resolvedParentId === null && node.type !== 'folder') {
			throw new Error('Root organize section can only contain folders.');
		}
		if (
			resolvedParentId &&
			node.type === 'folder' &&
			isAncestor(nodeMap, resolvedParentId, nodeId)
		) {
			throw new Error('Cannot move a folder into its descendant.');
		}
		const nextIndex =
			index ??
			nextOrganizeIndex(
				nodes.filter((entry) => entry.id !== nodeId),
				resolvedParentId
			);
		const record = ensureRecord(doc, nodeId);
		record.set('parentId', resolvedParentId);
		record.set('index', nextIndex);
		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return { id: nodeId, parentId: resolvedParentId, index: nextIndex };
	} finally {
		socket.disconnect();
	}
}

/**
 * 添加组织链接
 */
export async function addOrganizeLinkHandler(params: {
	workspaceId?: string;
	folderId: string;
	type: 'doc' | 'tag' | 'collection';
	targetId: string;
	index?: string;
}) {
	const { workspaceId, folderId, type, targetId, index } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodes = readOrganizeNodes(doc);
		const nodeMap = organizeNodeMap(nodes);
		ensureNodeIsFolder(nodeMap, folderId);
		const linkId = generateId();
		const nextIndex = index ?? nextOrganizeIndex(nodes, folderId);
		const record = ensureRecord(doc, linkId);
		record.set('id', linkId);
		record.set('type', type);
		record.set('data', targetId);
		record.set('parentId', folderId);
		record.set('index', nextIndex);
		record.delete('$$DELETED');
		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return {
			id: linkId,
			parentId: folderId,
			type,
			data: targetId,
			index: nextIndex,
			storageDocId: docId
		};
	} finally {
		socket.disconnect();
	}
}

/**
 * 删除组织链接
 */
export async function deleteOrganizeLinkHandler(params: { workspaceId?: string; nodeId: string }) {
	const { workspaceId, nodeId } = params;
	const resolvedWorkspaceId = requireWorkspaceId(workspaceId);
	const { socket } = await getSocketContext();
	try {
		await joinWorkspace(socket, resolvedWorkspaceId);
		const { docId, doc } = await loadFoldersDoc(socket, resolvedWorkspaceId);
		const nodeMap = organizeNodeMap(readOrganizeNodes(doc));
		const node = nodeMap.get(nodeId);
		if (!node || node.type === 'folder') {
			throw new Error(`Organize link '${nodeId}' was not found.`);
		}
		deleteRecord(ensureRecord(doc, nodeId));
		await saveFoldersDoc(socket, resolvedWorkspaceId, docId, doc);
		return { success: true, nodeId };
	} finally {
		socket.disconnect();
	}
}
