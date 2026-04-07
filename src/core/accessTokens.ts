import { createGraphQLClient } from '../graphqlClient.js';

/**
 * 列出访问令牌
 */
export async function listAccessTokensHandler() {
	const gql = await createGraphQLClient();
	try {
		const query = `query { currentUser { accessTokens { id name createdAt expiresAt } } }`;
		const data = await gql.request<{ currentUser: { accessTokens: any[] } }>(query);
		return data.currentUser?.accessTokens || [];
	} catch (error: any) {
		console.error('List access tokens error:', error.message);
		return { error: error.message };
	}
}

/**
 * 生成访问令牌
 */
export async function generateAccessTokenHandler(params: { name: string; expiresAt?: string }) {
	const gql = await createGraphQLClient();
	const mutation = `mutation($input: GenerateAccessTokenInput!){ generateUserAccessToken(input:$input){ id name createdAt expiresAt token } }`;
	const data = await gql.request<{ generateUserAccessToken: any }>(mutation, {
		input: { name: params.name, expiresAt: params.expiresAt ?? null }
	});
	return data.generateUserAccessToken;
}

/**
 * 撤销访问令牌
 */
export async function revokeAccessTokenHandler(params: { id: string }) {
	const gql = await createGraphQLClient();
	const mutation = `mutation($id:String!){ revokeUserAccessToken(id:$id) }`;
	const data = await gql.request<{ revokeUserAccessToken: boolean }>(mutation, {
		id: params.id
	});
	return { success: data.revokeUserAccessToken };
}
