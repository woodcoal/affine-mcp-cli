import { GraphQLClient } from "../../graphqlClient.js";
import { loadConfig } from "../../config.js";

let gqlInstance: GraphQLClient | null = null;

/**
 * 获取 GraphQLClient 单例
 */
export function getGraphQLClient(): GraphQLClient {
  if (!gqlInstance) {
    const config = loadConfig();
    const gqlHeaders = { ...(config.headers || {}) };
    gqlInstance = new GraphQLClient({
      endpoint: `${config.baseUrl}${config.graphqlPath}`,
      headers: gqlHeaders,
      bearer: config.apiToken
    });
    
    if (config.cookie) {
      gqlInstance.setCookie(config.cookie);
    }
  }
  return gqlInstance;
}

/**
 * 获取默认的工作区 ID
 */
export function getDefaultWorkspaceId(): string | undefined {
  const config = loadConfig();
  return config.defaultWorkspaceId;
}

/**
 * 重置 GraphQLClient 实例（用于测试或配置变更后重新初始化）
 */
export function resetGraphQLClient(): void {
  gqlInstance = null;
}
