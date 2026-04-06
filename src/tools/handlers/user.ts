import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";

/**
 * 获取当前登录用户
 */
export async function currentUserHandler() {
  const gql = getGraphQLClient();
  const query = `query Me { currentUser { id name email emailVerified avatarUrl disabled } }`;
  const data = await gql.request<{ currentUser: any }>(query);
  return text(data.currentUser);
}
