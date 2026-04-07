/**
 * MCP 服务器入口
 * 启动 Model Context Protocol 服务器，提供与 AFFiNE 的交互能力
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig, VERSION } from '../config.js';
import { registerWorkspaceTools } from './workspaces.js';
import { registerDocTools } from './docs.js';
import { registerCommentTools } from './comments.js';
import { registerHistoryTools } from './history.js';
import { registerUserTools } from './user.js';
import { registerUserCRUDTools } from './userCRUD.js';
import { registerAccessTokenTools } from './accessTokens.js';
import { registerBlobTools } from './blobStorage.js';
import { registerNotificationTools } from './notifications.js';
import { registerAuthTools } from './auth.js';
import { registerOrganizeTools } from './organize.js';
import { startHttpMcpServer } from '../client/sse.js';
import { existsSync } from 'fs';
import { GLOBAL_CONFIG_FILE, LOCAL_CONFIG_FILE } from '../config.js';

import { createGraphQLClient } from '../graphqlClient.js';

// 启动诊断信息（在 Claude Code MCP 服务器日志中通过 stderr 可见）
console.error(
	`[affine-mcp] Global config: ${GLOBAL_CONFIG_FILE} (${existsSync(GLOBAL_CONFIG_FILE) ? 'found' : 'missing'})`
);
console.error(
	`[affine-mcp] Local config: ${LOCAL_CONFIG_FILE} (${existsSync(LOCAL_CONFIG_FILE) ? 'found' : 'missing'})`
);

// MCP 服务器模式（默认）
const config = loadConfig();
const transportMode = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();
const useHttpTransport =
	transportMode === 'sse' || transportMode === 'http' || transportMode === 'streamable';

// ---------------------------------------------------------------------------
// 工具过滤 — 在模块加载时解析一次（HTTP 模式下不按会话解析）
// ---------------------------------------------------------------------------
const KNOWN_GROUPS = new Set<string>([
	'workspaces',
	'docs',
	'comments',
	'history',
	'organize',
	'users',
	'access_tokens',
	'blobs',
	'notifications'
]);

const DISABLED_GROUPS = new Set<string>(
	(process.env.AFFINE_DISABLED_GROUPS || '')
		.split(',')
		.map((s: string) => s.trim().toLowerCase())
		.filter(Boolean)
);

const DISABLED_TOOLS = new Set<string>(
	(process.env.AFFINE_DISABLED_TOOLS || '')
		.split(',')
		.map((s: string) => s.trim())
		.filter(Boolean)
);

console.error(`[affine-mcp] Endpoint: ${config.baseUrl}${config.graphqlPath}`);
const hasAuth = !!(config.apiToken || config.cookie || (config.email && config.password));
console.error(`[affine-mcp] Auth: ${hasAuth ? 'configured' : 'not configured'}`);
console.error(`[affine-mcp] HTTP auth mode: ${config.authMode}`);
if (
	hasAuth &&
	config.baseUrl.startsWith('http://') &&
	!config.baseUrl.includes('localhost') &&
	!config.baseUrl.includes('127.0.0.1')
) {
	console.error('WARNING: Credentials configured over plain HTTP. Use HTTPS for remote servers.');
}
console.error(`[affine-mcp] Workspace: ${config.defaultWorkspaceId ? 'set' : '(none)'}`);

// 警告未知的组名（可能是拼写错误）以免它们静默无效
for (const g of DISABLED_GROUPS) {
	if (!KNOWN_GROUPS.has(g)) {
		console.error(
			`[affine-mcp] WARNING: Unknown group "${g}" in AFFINE_DISABLED_GROUPS — ` +
				`valid groups: ${[...KNOWN_GROUPS].join(', ')}`
		);
	}
}

if (config.authMode === 'oauth' && !useHttpTransport) {
	throw new Error('AFFINE_MCP_AUTH_MODE=oauth requires MCP_TRANSPORT=http (or streamable/sse).');
}

async function buildServer() {
	const server = new McpServer({ name: 'affine-mcp', version: VERSION });

	await createGraphQLClient();

	// ---------------------------------------------------------------------------
	// 每个工具的黑名单：在此服务器实例上修补 registerTool，
	// 以便 AFFINE_DISABLED_TOOLS 中的单个工具在注册期间被静默跳过。
	// 同时，为每个核心函数添加包装，将其返回值转换为 MCP 期望的格式。
	// 所有工具文件都使用 server.registerTool — 不需要修补 server.tool。
	// ---------------------------------------------------------------------------
	const originalRegisterTool = (server as any).registerTool?.bind(server);
	if (typeof originalRegisterTool !== 'function') {
		console.error(
			'[affine-mcp] WARNING: server.registerTool not found — ' +
				'AFFINE_DISABLED_TOOLS will have no effect. ' +
				'The MCP SDK API may have changed.'
		);
	} else {
		(server as any).registerTool = (name: string, options: any, handler: any) => {
			if (DISABLED_TOOLS.has(name)) return;

			// 包装核心函数，将其返回值转换为 MCP 期望的格式
			const wrappedHandler = async (args: any, extra: any) => {
				const result = await handler(args, extra);
				// 如果结果已经是 MCP 格式，直接返回
				if (result && typeof result === 'object' && 'content' in result) {
					return result;
				}
				// 否则，将结果包装为 MCP 格式
				return {
					content: [
						{
							type: 'text',
							text: typeof result === 'string' ? result : JSON.stringify(result)
						}
					]
				};
			};

			return originalRegisterTool(name, options, wrappedHandler);
		};
	}

	// 直接从环境变量记录过滤器
	console.error(
		`[affine-mcp] Disabled groups: ${process.env.AFFINE_DISABLED_GROUPS || '(none)'}`
	);
	console.error(`[affine-mcp] Disabled tools: ${process.env.AFFINE_DISABLED_TOOLS || '(none)'}`);

	if (!DISABLED_GROUPS.has('workspaces')) registerWorkspaceTools(server);
	if (!DISABLED_GROUPS.has('docs')) registerDocTools(server);
	if (!DISABLED_GROUPS.has('comments')) registerCommentTools(server);
	if (!DISABLED_GROUPS.has('history')) registerHistoryTools(server);
	if (!DISABLED_GROUPS.has('organize')) registerOrganizeTools(server);
	if (!DISABLED_GROUPS.has('users')) {
		registerUserTools(server);
		registerUserCRUDTools(server);
		if (config.authMode !== 'oauth') {
			registerAuthTools(server);
		}
	}
	if (!DISABLED_GROUPS.has('access_tokens')) registerAccessTokenTools(server);
	if (!DISABLED_GROUPS.has('blobs')) registerBlobTools(server);
	if (!DISABLED_GROUPS.has('notifications')) registerNotificationTools(server);

	return server;
}

async function start() {
	if (useHttpTransport) {
		const DEFAULT_PORT = 3000;
		const portEnvValue = process.env.PORT;

		let port = DEFAULT_PORT;

		// 验证 HTTP 服务器端口（如果提供）
		if (portEnvValue != null && portEnvValue.trim() !== '') {
			const parsedPort = Number(portEnvValue);

			if (Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535) {
				port = parsedPort;
			} else {
				console.warn(
					`[affine-mcp] Invalid PORT "${portEnvValue}" (expected 0..65535 integer). Falling back to ${DEFAULT_PORT}.`
				);
			}
		}

		await startHttpMcpServer(buildServer, port, config);
	} else {
		// stdio transport 是典型桌面 MCP 客户端的默认传输方式
		const server = await buildServer();
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}
}

start().catch((err) => {
	console.error('Failed to start affine-mcp server:', err);
	process.exit(1);
});
