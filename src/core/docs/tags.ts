import * as Y from 'yjs';
import { text, getDefaultWorkspaceId } from '../utils.js';
import {
	wsUrlFromGraphQLEndpoint,
	connectWorkspaceSocket,
	joinWorkspace,
	loadDoc,
	pushDocUpdate
} from '../../client/ws.js';
import {
	getCookieAndEndpoint,
	getWorkspacePageEntries,
	getWorkspaceTagOptionMaps,
	getStringArray,
	resolveTagLabels,
	normalizeTag,
	ensureWorkspaceTagOption,
	ensureTagArray,
	syncTagArrayToOption,
	collectMatchingTagIndexes,
	deleteArrayIndexes,
	hasTag
} from './util.js';

/**
 * List all tags in a workspace and the number of docs attached to each tag.
 */
export async function listTagsHandler(parsed: { workspaceId?: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const snapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!snapshot.missing) {
			return text({ workspaceId, totalTags: 0, tags: [] });
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, 'base64'));
		const meta = wsDoc.getMap('meta');
		const pages = getWorkspacePageEntries(meta);
		const { options, byId } = getWorkspaceTagOptionMaps(meta);

		const tagCounts = new Map<string, number>();
		for (const option of options) {
			const normalized = option.value.trim();
			if (!normalized || tagCounts.has(normalized)) {
				continue;
			}
			tagCounts.set(normalized, 0);
		}

		for (const page of pages) {
			const uniqueTags = new Set<string>();
			const resolved = resolveTagLabels(getStringArray(page.tagsArray), byId);
			for (const tag of resolved) {
				const normalized = tag.trim();
				if (!normalized) {
					continue;
				}
				uniqueTags.add(normalized);
			}
			for (const tag of uniqueTags) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			}
		}

		const tags = [...tagCounts.entries()]
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([name, docCount]) => ({ name, docCount }));

		return text({
			workspaceId,
			totalTags: tags.length,
			tags
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * List documents that contain the requested tag.
 */
export async function listDocsByTagHandler(parsed: {
	workspaceId?: string;
	tag: string;
	ignoreCase?: boolean;
}) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const tag = normalizeTag(parsed.tag);
	const ignoreCase = parsed.ignoreCase ?? true;

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const snapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!snapshot.missing) {
			return text({ workspaceId, tag, ignoreCase, totalDocs: 0, docs: [] });
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, 'base64'));
		const meta = wsDoc.getMap('meta');
		const pages = getWorkspacePageEntries(meta);
		const { byId } = getWorkspaceTagOptionMaps(meta);
		const docs = pages
			.map((page) => {
				const rawTags = getStringArray(page.tagsArray);
				const tags = resolveTagLabels(rawTags, byId);
				return {
					id: page.id,
					title: page.title,
					createDate: page.createDate,
					updatedDate: page.updatedDate,
					tags,
					rawTags
				};
			})
			.filter(
				(page) =>
					hasTag(page.tags, tag, ignoreCase) || hasTag(page.rawTags, tag, ignoreCase)
			)
			.map(({ rawTags: _rawTags, ...page }) => page);

		return text({
			workspaceId,
			tag,
			ignoreCase,
			totalDocs: docs.length,
			docs
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Create a workspace-level tag entry for future reuse.
 */
export async function createTagHandler(parsed: { workspaceId?: string; tag: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const tag = normalizeTag(parsed.tag);

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const snapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!snapshot.missing) {
			throw new Error(`Workspace root document not found for workspace ${workspaceId}`);
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, 'base64'));
		const prevSV = Y.encodeStateVector(wsDoc);
		const meta = wsDoc.getMap('meta');
		const { created } = ensureWorkspaceTagOption(meta, tag);
		if (!created) {
			return text({ workspaceId, tag, created: false });
		}

		const delta = Y.encodeStateAsUpdate(wsDoc, prevSV);
		await pushDocUpdate(
			socket,
			workspaceId,
			workspaceId,
			Buffer.from(delta).toString('base64')
		);
		return text({ workspaceId, tag, created: true });
	} finally {
		socket.disconnect();
	}
}

/**
 * Add a tag to a document.
 */
export async function addTagToDocHandler(parsed: {
	workspaceId?: string;
	docId: string;
	tag: string;
}) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const tag = normalizeTag(parsed.tag);

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);

		const wsSnapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnapshot.missing) {
			throw new Error(`Workspace root document not found for workspace ${workspaceId}`);
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnapshot.missing, 'base64'));
		const wsPrevSV = Y.encodeStateVector(wsDoc);
		const wsMeta = wsDoc.getMap('meta');
		const page = getWorkspacePageEntries(wsMeta).find((entry) => entry.id === parsed.docId);
		if (!page) {
			throw new Error(`docId ${parsed.docId} is not present in workspace ${workspaceId}`);
		}

		const { option, created: optionCreated } = ensureWorkspaceTagOption(wsMeta, tag);
		const pageTags = ensureTagArray(page.entry);
		const pageSync = syncTagArrayToOption(pageTags, tag, option);
		const wsChanged = optionCreated || pageSync.changed;
		if (wsChanged) {
			const wsDelta = Y.encodeStateAsUpdate(wsDoc, wsPrevSV);
			await pushDocUpdate(
				socket,
				workspaceId,
				workspaceId,
				Buffer.from(wsDelta).toString('base64')
			);
		}

		let docMetaSynced = false;
		let warning: string | null = null;
		const docSnapshot = await loadDoc(socket, workspaceId, parsed.docId);
		if (!docSnapshot.missing) {
			warning = `Document ${parsed.docId} snapshot not found; workspace tag map was updated only.`;
		} else {
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(docSnapshot.missing, 'base64'));
			const docPrevSV = Y.encodeStateVector(doc);
			const docMeta = doc.getMap('meta');
			const docTags = ensureTagArray(docMeta);
			const docSync = syncTagArrayToOption(docTags, tag, option);
			if (docSync.changed) {
				const docDelta = Y.encodeStateAsUpdate(doc, docPrevSV);
				await pushDocUpdate(
					socket,
					workspaceId,
					parsed.docId,
					Buffer.from(docDelta).toString('base64')
				);
			}
			docMetaSynced = true;
		}

		const { byId } = getWorkspaceTagOptionMaps(wsMeta);

		return text({
			workspaceId,
			docId: parsed.docId,
			tag,
			added: !pageSync.existed,
			tags: resolveTagLabels(getStringArray(pageTags), byId),
			docMetaSynced,
			warning
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Remove a tag from a document.
 */
export async function removeTagFromDocHandler(parsed: {
	workspaceId?: string;
	docId: string;
	tag: string;
}) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const tag = normalizeTag(parsed.tag);

	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);

		const wsSnapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnapshot.missing) {
			throw new Error(`Workspace root document not found for workspace ${workspaceId}`);
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnapshot.missing, 'base64'));
		const wsPrevSV = Y.encodeStateVector(wsDoc);
		const wsMeta = wsDoc.getMap('meta');
		const page = getWorkspacePageEntries(wsMeta).find((entry) => entry.id === parsed.docId);
		if (!page) {
			throw new Error(`docId ${parsed.docId} is not present in workspace ${workspaceId}`);
		}

		const option =
			getWorkspaceTagOptionMaps(wsMeta).byValueLower.get(tag.toLocaleLowerCase()) || null;
		const pageTags = ensureTagArray(page.entry);
		const pageTagIndexes = collectMatchingTagIndexes(pageTags, tag, option, true);
		const pageRemoved = deleteArrayIndexes(pageTags, pageTagIndexes);
		if (pageRemoved) {
			const wsDelta = Y.encodeStateAsUpdate(wsDoc, wsPrevSV);
			await pushDocUpdate(
				socket,
				workspaceId,
				workspaceId,
				Buffer.from(wsDelta).toString('base64')
			);
		}

		let docMetaSynced = false;
		let warning: string | null = null;
		const docSnapshot = await loadDoc(socket, workspaceId, parsed.docId);
		if (!docSnapshot.missing) {
			warning = `Document ${parsed.docId} snapshot not found; workspace tag map was updated only.`;
		} else {
			const doc = new Y.Doc();
			Y.applyUpdate(doc, Buffer.from(docSnapshot.missing, 'base64'));
			const docPrevSV = Y.encodeStateVector(doc);
			const docMeta = doc.getMap('meta');
			const docTags = ensureTagArray(docMeta);
			const docTagIndexes = collectMatchingTagIndexes(docTags, tag, option, true);
			if (deleteArrayIndexes(docTags, docTagIndexes)) {
				const docDelta = Y.encodeStateAsUpdate(doc, docPrevSV);
				await pushDocUpdate(
					socket,
					workspaceId,
					parsed.docId,
					Buffer.from(docDelta).toString('base64')
				);
			}
			docMetaSynced = true;
		}

		const { byId } = getWorkspaceTagOptionMaps(wsMeta);

		return text({
			workspaceId,
			docId: parsed.docId,
			tag,
			removed: pageRemoved,
			tags: resolveTagLabels(getStringArray(pageTags), byId),
			docMetaSynced,
			warning
		});
	} finally {
		socket.disconnect();
	}
}

/**
 * Filter documents by tag name (case-insensitive substring match).
 */
export async function getDocsByTagHandler(parsed: { workspaceId?: string; tag: string }) {
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId is required.');
	const { endpoint, cookie, bearer } = await getCookieAndEndpoint();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const wsSnap = await loadDoc(socket, workspaceId, workspaceId);
		if (!wsSnap.missing) return text({ tag: parsed.tag, count: 0, docs: [] });
		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(wsSnap.missing, 'base64'));
		const meta = wsDoc.getMap('meta');
		const { byId, options } = getWorkspaceTagOptionMaps(meta);
		const q = parsed.tag.toLowerCase();
		const matchingTagIds = new Set(
			options.filter((o) => o.value.toLowerCase().includes(q)).map((o) => o.id)
		);
		if (matchingTagIds.size === 0) {
			return text({
				tag: parsed.tag,
				count: 0,
				docs: [],
				availableTags: options.map((o) => o.value)
			});
		}
		const pages = getWorkspacePageEntries(meta);
		const baseUrl = (
			process.env.AFFINE_BASE_URL || endpoint.replace(/\/graphql\/?$/, '')
		).replace(/\/$/, '');
		const matched = pages
			.map((p) => {
				const rawTagIds = getStringArray(p.tagsArray);
				return { p, rawTagIds };
			})
			.filter(({ rawTagIds }) => rawTagIds.some((tid) => matchingTagIds.has(tid)))
			.map(({ p, rawTagIds }) => ({
				docId: p.id,
				title: p.title ?? 'Untitled',
				tags: resolveTagLabels(rawTagIds, byId),
				url: `${baseUrl}/workspace/${workspaceId}/${p.id}`
			}));
		return text({ tag: parsed.tag, count: matched.length, docs: matched });
	} finally {
		socket.disconnect();
	}
}
