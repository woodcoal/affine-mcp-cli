import { text } from "../../util/mcp.js";
import { getGraphQLClient } from "./graphqlClient.js";
import { loginWithPassword } from "../../auth.js";
import { loadConfig } from "../../config.js";

/**
 * 登录的参数类型
 */
export interface SignInParams {
  email: string;
  password: string;
}

/**
 * 登录
 */
export async function signInHandler(params: SignInParams) {
  const config = loadConfig();
  const baseUrl = config.baseUrl;
  const { cookieHeader } = await loginWithPassword(baseUrl, params.email, params.password);
  
  // 设置全局 gql 实例的 cookie
  const gql = getGraphQLClient();
  gql.setCookie(cookieHeader);
  
  return text({ signedIn: true });
}
