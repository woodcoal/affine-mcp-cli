import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";

/**
 * 列出访问令牌的参数类型
 */
export interface ListAccessTokensParams {}

/**
 * 生成访问令牌的参数类型
 */
export interface GenerateAccessTokenParams {
  name: string;
  expiresAt?: string;
}

/**
 * 撤销访问令牌的参数类型
 */
export interface RevokeAccessTokenParams {
  id: string;
}

/**
 * 列出访问令牌
 */
export async function listAccessTokensHandler(params: ListAccessTokensParams) {
  const gql = getGraphQLClient();
  try {
    const query = `query { currentUser { accessTokens { id name createdAt expiresAt } } }`;
    const data = await gql.request<{ currentUser: { accessTokens: any[] } }>(query);
    return text(data.currentUser?.accessTokens || []);
  } catch (error: any) {
    console.error("List access tokens error:", error.message);
    return text({ error: error.message });
  }
}

/**
 * 生成访问令牌
 */
export async function generateAccessTokenHandler(params: GenerateAccessTokenParams) {
  const gql = getGraphQLClient();
  const mutation = `mutation($input: GenerateAccessTokenInput!){ generateUserAccessToken(input:$input){ id name createdAt expiresAt token } }`;
  const data = await gql.request<{ generateUserAccessToken: any }>(mutation, { input: { name: params.name, expiresAt: params.expiresAt ?? null } });
  return text(data.generateUserAccessToken);
}

/**
 * 撤销访问令牌
 */
export async function revokeAccessTokenHandler(params: RevokeAccessTokenParams) {
  const gql = getGraphQLClient();
  const mutation = `mutation($id:String!){ revokeUserAccessToken(id:$id) }`;
  const data = await gql.request<{ revokeUserAccessToken: boolean }>(mutation, { id: params.id });
  return text({ success: data.revokeUserAccessToken });
}
