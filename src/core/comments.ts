import { text, getDefaultWorkspaceId } from './utils.js';
import { createGraphQLClient } from '../graphqlClient.js';
import {
	wsUrlFromGraphQLEndpoint,
	connectWorkspaceSocket,
	joinWorkspace,
	loadDoc
} from '../client/ws.js';
import * as Y from 'yjs';

/**
 * 列出评论
 */
export async function listCommentsHandler(params: {
	workspaceId?: string;
	docId: string;
	first?: number;
	offset?: number;
	after?: string;
}) {
	const gql = await createGraphQLClient();
	const workspaceId = params.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId required (or set AFFINE_WORKSPACE_ID)');

	const { docId, first, offset, after } = params;
	const query = `query ListComments($workspaceId:String!,$docId:String!,$first:Int,$offset:Int,$after:String){ workspace(id:$workspaceId){ comments(docId:$docId, pagination:{first:$first, offset:$offset, after:$after}){ totalCount pageInfo{ hasNextPage endCursor } edges{ cursor node{ id content createdAt updatedAt resolved user{ id name avatarUrl } replies{ id content createdAt updatedAt user{ id name avatarUrl } } } } } } }`;
	const data = await gql.request<{ workspace: any }>(query, {
		workspaceId,
		docId,
		first,
		offset,
		after
	});
	return text(data.workspace.comments);
}

/**
 * 创建评论
 */
export async function createCommentHandler(params: {
	workspaceId?: string;
	docId: string;
	docTitle?: string;
	docMode?: 'Page' | 'Edgeless' | 'page' | 'edgeless';
	content: any;
	mentions?: string[];
}) {
	const gql = await createGraphQLClient();
	const workspaceId = params.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId required (or set AFFINE_WORKSPACE_ID)');

	const mutation = `mutation CreateComment($input: CommentCreateInput!){ createComment(input:$input){ id content createdAt updatedAt resolved } }`;
	const normalizedDocMode =
		(params.docMode || 'page').toLowerCase() === 'edgeless' ? 'edgeless' : 'page';
	const normalizedContent =
		typeof params.content === 'string' ? { text: params.content } : params.content;
	const input = {
		content: normalizedContent,
		docId: params.docId,
		workspaceId,
		docTitle: params.docTitle || '',
		docMode: normalizedDocMode,
		mentions: params.mentions
	};
	const data = await gql.request<{ createComment: any }>(mutation, { input });
	return text(data.createComment);
}

/**
 * 更新评论
 */
export async function updateCommentHandler(params: { id: string; content: any }) {
	const gql = await createGraphQLClient();
	const mutation = `mutation UpdateComment($input: CommentUpdateInput!){ updateComment(input:$input) }`;
	const data = await gql.request<{ updateComment: boolean }>(mutation, {
		input: { id: params.id, content: params.content }
	});
	return text({ success: data.updateComment });
}

/**
 * 删除评论
 */
export async function deleteCommentHandler(params: { id: string }) {
	const gql = await createGraphQLClient();
	const mutation = `mutation DeleteComment($id:String!){ deleteComment(id:$id) }`;
	const data = await gql.request<{ deleteComment: boolean }>(mutation, {
		id: params.id
	});
	return text({ success: data.deleteComment });
}

/**
 * 解决评论
 */
export async function resolveCommentHandler(params: { id: string; resolved: boolean }) {
	const gql = await createGraphQLClient();
	const mutation = `mutation ResolveComment($input: CommentResolveInput!){ resolveComment(input:$input) }`;
	const data = await gql.request<{ resolveComment: boolean }>(mutation, {
		input: params
	});
	return text({ success: data.resolveComment });
}

/**
 * 列出工作区文档的参数类型（用于获取标签）
 */
export interface ListWorkspaceDocsParams {
	workspaceId?: string;
}

/**
 * 列出工作区文档（包含标签信息）
 */
export async function listWorkspaceDocsHandler(params: ListWorkspaceDocsParams) {
	const workspaceId = params.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) throw new Error('workspaceId required (or set AFFINE_WORKSPACE_ID)');

	const { endpoint, cookie, bearer } = await getSocketContext();
	const wsUrl = wsUrlFromGraphQLEndpoint(endpoint);
	const socket = await connectWorkspaceSocket(wsUrl, cookie, bearer);
	try {
		await joinWorkspace(socket, workspaceId);
		const snapshot = await loadDoc(socket, workspaceId, workspaceId);
		if (!snapshot.missing) {
			return text({ workspaceId, docs: [] });
		}

		const wsDoc = new Y.Doc();
		Y.applyUpdate(wsDoc, Buffer.from(snapshot.missing, 'base64'));
		const meta = wsDoc.getMap('meta');
		const pages = meta.get('pages');

		if (!(pages instanceof Y.Array)) {
			return text({ workspaceId, docs: [] });
		}

		const docs: any[] = [];
		for (let i = 0; i < pages.length; i++) {
			const page = pages.get(i);
			if (page instanceof Y.Map) {
				const docId = page.get('id');
				const doc = new Y.Doc();
				const docSnapshot = await loadDoc(socket, workspaceId, docId);
				if (docSnapshot.missing) {
					Y.applyUpdate(doc, Buffer.from(docSnapshot.missing, 'base64'));
					const docMeta = doc.getMap('meta');
					docs.push({
						id: docId,
						title: docMeta.get('title') || '',
						createDate: page.get('createDate'),
						tags: []
					});
				}
			}
		}

		return text({ workspaceId, docs });
	} finally {
		socket.disconnect();
	}
}

async function getSocketContext() {
	const gql = await createGraphQLClient();
	return {
		endpoint: gql.endpoint,
		cookie: gql.cookie,
		bearer: gql.bearer
	};
}
