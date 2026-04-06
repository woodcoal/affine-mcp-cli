import { text, getDefaultWorkspaceId } from '../utils.js';
import { createGraphQLClient } from '../../graphqlClient.js';

/**
 * Publish a doc (make public).
 */
export async function publishDocHandler(parsed: {
	workspaceId?: string;
	docId: string;
	mode?: 'Page' | 'Edgeless';
}) {
	const gql = await createGraphQLClient();
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const mutation = `mutation PublishDoc($workspaceId:String!,$docId:String!,$mode:PublicDocMode){ publishDoc(workspaceId:$workspaceId, docId:$docId, mode:$mode){ id workspaceId public mode } }`;
	const data = await gql.request<{ publishDoc: any }>(mutation, {
		workspaceId,
		docId: parsed.docId,
		mode: parsed.mode
	});
	return text(data.publishDoc);
}

/**
 * Revoke a doc's public access.
 */
export async function revokeDocHandler(parsed: { workspaceId?: string; docId: string }) {
	const gql = await createGraphQLClient();
	const workspaceId = parsed.workspaceId || getDefaultWorkspaceId();
	if (!workspaceId) {
		throw new Error(
			'workspaceId is required. Provide it as a parameter or set AFFINE_WORKSPACE_ID in environment.'
		);
	}
	const mutation = `mutation RevokeDoc($workspaceId:String!,$docId:String!){ revokePublicDoc(workspaceId:$workspaceId, docId:$docId){ id workspaceId public } }`;
	const data = await gql.request<{ revokePublicDoc: any }>(mutation, {
		workspaceId,
		docId: parsed.docId
	});
	return text(data.revokePublicDoc);
}
