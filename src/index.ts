import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig, VERSION } from './config.js';
import { registerWorkspaceTools } from './mcp/workspaces.js';
import { registerDocTools } from './mcp/docs.js';
import { registerCommentTools } from './mcp/comments.js';
import { registerHistoryTools } from './mcp/history.js';
import { registerUserTools } from './mcp/user.js';
import { registerUserCRUDTools } from './mcp/userCRUD.js';
import { registerAccessTokenTools } from './mcp/accessTokens.js';
import { registerBlobTools } from './mcp/blobStorage.js';
import { registerNotificationTools } from './mcp/notifications.js';
import { registerAuthTools } from './mcp/auth.js';
import { registerOrganizeTools } from './mcp/organize.js';
import { runCli } from './cli.js';
import { startHttpMcpServer } from './client/sse.js';
import { existsSync } from 'fs';
import { CONFIG_FILE } from './config.js';

import { createGraphQLClient } from './graphqlClient.js';

// CLI commands: affine-mcp login|status|logout|version
const rawArgs = process.argv.slice(2);
const cliArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;
const subcommand = cliArgs[0];
if (subcommand === '--version' || subcommand === '-v' || subcommand === 'version') {
	console.log(VERSION);
	process.exit(0);
}
if (subcommand === '--help' || subcommand === '-h') {
	await runCli('help');
	process.exit(0);
}
if (subcommand) {
	const handled = await runCli(subcommand, cliArgs.slice(1));
	if (!handled) {
		console.error(`Unknown command: ${subcommand}`);
		await runCli('help');
		process.exit(1);
	}
	process.exit(0);
}

// MCP server mode (default)
const config = loadConfig();
const transportMode = (process.env.MCP_TRANSPORT || 'stdio').toLowerCase();
const useHttpTransport =
	transportMode === 'sse' || transportMode === 'http' || transportMode === 'streamable';

// ---------------------------------------------------------------------------
// Tool filtering — parsed once at module load (not per-session in HTTP mode)
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

// Startup diagnostics (visible in Claude Code MCP server logs via stderr)
console.error(
	`[affine-mcp] Config: ${CONFIG_FILE} (${existsSync(CONFIG_FILE) ? 'found' : 'missing'})`
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

// Warn about unknown group names (likely typos) before they silently do nothing
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
	// Per-tool blacklist: patch registerTool on this server instance so individual
	// tools in AFFINE_DISABLED_TOOLS are silently skipped during registration.
	// All tool files use server.registerTool exclusively — no need to patch server.tool.
	// ---------------------------------------------------------------------------
	if (DISABLED_TOOLS.size > 0) {
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
				return originalRegisterTool(name, options, handler);
			};
		}
	}

	// Log filters directly from environment variables
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

		// Validate the HTTP server port if provided.
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
		// stdio transport is the default for typical desktop MCP clients
		const server = await buildServer();
		const transport = new StdioServerTransport();
		await server.connect(transport);
	}
}

start().catch((err) => {
	console.error('Failed to start affine-mcp server:', err);
	process.exit(1);
});
