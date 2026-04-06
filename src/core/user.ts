import { text } from './utils.js';
import { createGraphQLClient } from '../graphqlClient.js';

/**
 * 获取当前登录用户
 */
export async function currentUserHandler() {
	const gql = await createGraphQLClient();
	const query = `query Me { currentUser { id name email emailVerified avatarUrl disabled } }`;
	const data = await gql.request<{ currentUser: any }>(query);
	return text(data.currentUser);
}
