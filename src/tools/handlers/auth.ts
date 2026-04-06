import { text, getGraphQLClient } from "./utils.js";
import { loginWithPassword } from "../../auth.js";
import { loadConfig } from "../../config.js";

/**
 * 登录
 */
export async function signInHandler(params: {
  email: string;
  password: string;
}) {
  const config = loadConfig();
  const baseUrl = config.baseUrl;
  const { cookieHeader } = await loginWithPassword(
    baseUrl,
    params.email,
    params.password,
  );

  // 设置全局 gql 实例的 cookie
  const gql = getGraphQLClient();
  gql.setCookie(cookieHeader);

  return text({ signedIn: true });
}
