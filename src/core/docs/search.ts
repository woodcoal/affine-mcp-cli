import * as Y from 'yjs';
import { text, getDefaultWorkspaceId } from '../utils.js';
import {
	wsUrlFromGraphQLEndpoint,
	connectWorkspaceSocket,
	joinWorkspace,
	loadDoc
} from '../../client/ws.js';
import { renderBlocksToMarkdown } from '../../markdown/render.js';
import {
	getCookieAndEndpoint,
	getWorkspacePageEntries,
	getWorkspaceTagOptionMaps,
	getStringArray,
	resolveTagLabels,
	collectDocForMarkdown
} from './util.js';

const getSearchMatchRank = (
	title: string | null,
	normalizedQuery: string,
	matchMode: 'substring' | 'prefix' | 'exact'
): number | null => {
	if (!title) return null;
	const normalizedTitle = title.toLocaleLowerCase();
	const isExact = normalizedTitle === normalizedQuery;
	const isPrefix = normalizedTitle.startsWith(normalizedQuery);
	const isSubstring = normalizedTitle.includes(normalizedQuery);

	if (matchMode === 'exact') {
		return isExact ? 0 : null;
	}
	if (matchMode === 'prefix') {
		return isPrefix ? (isExact ? 0 : 1) : null;
	}
	if (isExact) return 0;
	if (isPrefix) return 1;
	if (isSubstring) return 2;
	return null;
};

/**
 * Fast title search via workspace metadata.
 */
export async function searchDocsHandler(parsed: {
	workspaceId?: string;
	query: string;
	limit?: number;
	matchMode?: 'substring' | 'prefix' | 'exact';
	tag?: string;
	sortBy?: 'relevance' | 'updatedAt';
	sortDirection?: 'asc' | 'desc';
}) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const q = (parsed.query ?? '').toLocaleLowerCase().trim();
	if (!q) throw new Error('query is required.');
	const limit = parsed.limit ?? 20;
	const matchMode = parsed.matchMode ?? 'substring';
	const sortBy = parsed.sortBy ?? 'relevance';
	const sortDirection = parsed.sortDirection ?? 'desc';
	const normalizedTag = (parsed.tag ?? '').toLocaleLowerCase().trim();

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const snapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!snapshot.missing) {
			return text({ query: q, results: [], totalCount: 0 });
		}
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, 'base64'));
		const meta = wsDoc.getMap('meta');
		const pages = getWorkspacePageEntries(meta);
		const { byId } = getWorkspaceTagOptionMaps(meta);

		const baseUrl = (
			process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')
		).replace(/\/$/, '');
		const filtered = pages
			.map((page) => {
				const rank = getSearchMatchRank(page.title, q, matchMode);
				if (rank === null) {
					return null;
				}
				const tags = resolveTagLabels(getStringArray(page.tagsArray), byId);
				if (
					normalizedTag &&
					!tags.some((tag) => tag.toLocaleLowerCase().includes(normalizedTag))
				) {
					return null;
				}
				const updatedTimestamp = page.updatedDate ?? page.createDate ?? 0;
				return {
					docId: page.id,
					title: page.title,
					tags,
					updatedAt:
						updatedTimestamp > 0 ? new Date(updatedTimestamp).toISOString() : null,
					updatedTimestamp,
					url: `${baseUrl}/workspace/${workspaceId}/${page.id}`,
					rank
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null);

		filtered.sort((a, b) => {
			if (sortBy === 'updatedAt') {
				const diff = a.updatedTimestamp - b.updatedTimestamp;
				if (diff !== 0) {
					return sortDirection === 'asc' ? diff : -diff;
				}
			} else if (a.rank !== b.rank) {
				return a.rank - b.rank;
			} else if (a.updatedTimestamp !== b.updatedTimestamp) {
				return b.updatedTimestamp - a.updatedTimestamp;
			}
			return (a.title ?? '').localeCompare(b.title ?? '');
		});

		const totalCount = filtered.length;
		const matches = filtered.slice(0, limit).map((entry) => ({
			docId: entry.docId,
			title: entry.title,
			tags: entry.tags,
			updatedAt: entry.updatedAt,
			url: entry.url
		}));

		return text({
			query: parsed.query,
			tag: parsed.tag ?? null,
			matchMode,
			sortBy,
			sortDirection,
			totalCount,
			results: matches
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Find a document by title and return its content as markdown.
 */
export async function getDocByTitleHandler(parsed: {
	workspaceId?: string;
	query: string;
	limit?: number;
}) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnap.missing) return text({ query: parsed.query, found: false, results: [] });
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
		const q = parsed.query.toLowerCase();
		const limit = parsed.limit ?? 1;
		const matches = getWorkspacePageEntries(wsDoc.getMap('meta'))
			.filter((p) => p.title && p.title.toLowerCase().includes(q))
			.slice(0, limit);
		if (matches.length === 0) return text({ query: parsed.query, found: false, results: [] });
		const results = [];
		for (const match of matches) {
			const snap = await loadDoc(socket, workspaceId, match.id);
			if (!snap.missing) {
				results.push({ docId: match.id, title: match.title, found: false });
				continue;
			}
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(snap.missing, 'base64'));
			const collected = collectDocForMarkdown(doc, new Map());
			const rendered = renderBlocksToMarkdown({
				rootBlockIds: collected.rootBlockIds,
				blocksById: collected.blocksById
			});
			results.push({
				docId: match.id,
				title: match.title,
				found: true,
				markdown: rendered.markdown,
				url: `${(process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')).replace(/\/$/, '')}/workspace/${workspaceId}/${match.id}`
			});
		}
		return text({
			query: parsed.query,
			found: results.some((r) => (r as any).found),
			results
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Returns the full document hierarchy as a tree.
 */
export async function listWorkspaceTreeHandler(parsed: { workspaceId?: string; depth?: number }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const maxDepth = parsed.depth ?? 3;
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnap.missing) return text({ workspaceId, tree: [] });
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
		const pages = getWorkspacePageEntries(wsDoc.getMap('meta'));
		const titleById = new Map(pages.map((p) => [p.id, p.title ?? 'Untitled']));
		const childrenOf = new Map<string, string[]>();
		const allChildren = new Set<string>();
		for (const page of pages) {
			const snap = await loadDoc(socket, workspaceId, page.id);
			if (!snap.missing) continue;
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(snap.missing, 'base64'));
			const blocks = doc.getMap('blocks') as Y.Map<any>;
			const kids: string[] = [];
			for (const [, raw] of blocks) {
				if (!(raw instanceof Y.Map)) continue;
				if (raw.get('sys:flavour') !== 'affine:embed-linked-doc') continue;
				const pid = raw.get('prop:pageId');
				if (typeof pid === 'string' && pid && titleById.has(pid)) {
					kids.push(pid);
					allChildren.add(pid);
				}
			}
			if (kids.length) childrenOf.set(page.id, kids);
		}
		const baseUrl = (
			process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')
		).replace(/\/$/, '');
		const roots = pages.filter((p) => !allChildren.has(p.id)).map((p) => p.id);
		const buildNode = (id: string, depth: number): any => ({
			docId: id,
			title: titleById.get(id) ?? 'Untitled',
			url: `${baseUrl}/workspace/${workspaceId}/${id}`,
			children:
				depth < maxDepth
					? (childrenOf.get(id) ?? []).map((cid) => buildNode(cid, depth + 1))
					: []
		});
		return text({
			workspaceId,
			totalDocs: pages.length,
			rootCount: roots.length,
			tree: roots.map((id) => buildNode(id, 0))
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Find all documents that have no parent.
 */
export async function getOrphanDocsHandler(parsed: { workspaceId?: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnap.missing) return text({ orphans: [] });
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
		const pages = getWorkspacePageEntries(wsDoc.getMap('meta'));
		const titleById = new Map(pages.map((p) => [p.id, p.title ?? 'Untitled']));
		const allChildren = new Set<string>();
		for (const page of pages) {
			const snap = await loadDoc(socket, workspaceId, page.id);
			if (!snap.missing) continue;
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(snap.missing, 'base64'));
			const blocks = doc.getMap('blocks') as Y.Map<any>;
			for (const [, raw] of blocks) {
				if (!(raw instanceof Y.Map)) continue;
				if (raw.get('sys:flavour') !== 'affine:embed-linked-doc') continue;
				const pageId = raw.get('prop:pageId');
				if (typeof pageId === 'string' && pageId) allChildren.add(pageId);
			}
		}
		const baseUrl = (
			process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')
		).replace(/\/$/, '');
		const orphans = pages
			.filter((p) => !allChildren.has(p.id))
			.map((p) => ({
				docId: p.id,
				title: titleById.get(p.id) ?? 'Untitled',
				url: `${baseUrl}/workspace/${workspaceId}/${p.id}`
			}));
		return text({ count: orphans.length, orphans });
	} finally {
		socket.disconnect();
	}
}

/**
 * Find all documents that embed-link to a given doc.
 */
export async function listBacklinksHandler(parsed: { workspaceId?: string; docId: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnap.missing) return text({ docId: parsed.docId, count: 0, backlinks: [] });
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
		const pages = getWorkspacePageEntries(wsDoc.getMap('meta'));
		const titleById = new Map(pages.map((p) => [p.id, p.title]));
		const backlinks: Array<{
			docId: string;
			title: string | null;
			url: string;
		}> = [];
		for (const page of pages) {
			if (page.id === parsed.docId) continue;
			const snap = await loadDoc(socket, workspaceId, page.id);
			if (!snap.missing) continue;
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(snap.missing, 'base64'));
			const blocks = doc.getMap('blocks') as Y.Map<any>;
			for (const [, raw] of blocks) {
				if (!(raw instanceof Y.Map)) continue;
				if (
					raw.get('sys:flavour') === 'affine:embed-linked-doc' &&
					raw.get('prop:pageId') === parsed.docId
				) {
					backlinks.push({
						docId: page.id,
						title: titleById.get(page.id) ?? null,
						url: `${(process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')).replace(/\/$/, '')}/workspace/${workspaceId}/${page.id}`
					});
					break;
				}
			}
		}
		return text({ docId: parsed.docId, count: backlinks.length, backlinks });
	} finally {
		socket.disconnect();
	}
}

/**
 * List the direct children of a document in the sidebar.
 */
export async function listChildrenHandler(parsed: { workspaceId?: string; docId: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const titleById = new Map<string, string>();
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (wsSnap.missing) {
			const wsDoc = new Y.Doc();
			Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
			for (const page of getWorkspacePageEntries(wsDoc.getMap('meta'))) {
				if (page.title) titleById.set(page.id, page.title);
			}
		}
		const snap = await loadDoc(socket, workspaceId, parsed.docId);
		if (!snap.missing) return text({ docId: parsed.docId, children: [] });
		const doc = new Y.Doc();
		Y.applyUpdate(doc, Buffer.from(snap.missing, 'base64'));
		const blocks = doc.getMap('blocks') as Y.Map<any>;
		const children: Array<{
			docId: string;
			title: string | null;
			url: string;
		}> = [];
		for (const [, raw] of blocks) {
			if (!(raw instanceof Y.Map)) continue;
			if (raw.get('sys:flavour') !== 'affine:embed-linked-doc') continue;
			const pageId = raw.get('prop:pageId');
			if (typeof pageId === 'string' && pageId) {
				children.push({
					docId: pageId,
					title: titleById.get(pageId) ?? null,
					url: `${(process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')).replace(/\/$/, '')}/workspace/${workspaceId}/${pageId}`
				});
			}
		}
		return text({ docId: parsed.docId, count: children.length, children });
	} finally {
		socket.disconnect();
	}
}
