import { GraphQLClient } from './client/graphqlClient.js';
import { loginWithPassword } from './auth.js';
import { loadConfig } from './config.js';

let gqlInstance: GraphQLClient;

export async function createGraphQLClient() {
	if (!gqlInstance) {
		const config = loadConfig();
		const gqlHeaders = { ...(config.headers || {}) };
		const gqlBearer = config.apiToken;

		if (config.authMode === 'oauth') {
			if (!gqlBearer) {
				throw new Error('AFFINE_API_TOKEN is required when AFFINE_MCP_AUTH_MODE=oauth.');
			}
			if (config.cookie || config.email || config.password) {
				console.error(
					'[affine-mcp] OAuth mode uses the configured AFFINE_API_TOKEN service credential. ' +
						'Ignoring AFFINE_COOKIE / AFFINE_EMAIL / AFFINE_PASSWORD.'
				);
			}
			delete gqlHeaders.Cookie;
			if (process.env.AFFINE_LOGIN_AT_START) {
				console.error(
					'[affine-mcp] AFFINE_LOGIN_AT_START is ignored when AFFINE_MCP_AUTH_MODE=oauth.'
				);
			}
		}

		// Initialize GraphQL client with authentication
		const gql = new GraphQLClient({
			endpoint: `${config.baseUrl}${config.graphqlPath}`,
			headers: gqlHeaders,
			bearer: gqlBearer
		});

		// Try email/password authentication if no other auth method is configured.
		// To avoid startup timeouts in MCP clients, default to async login after the stdio handshake.
		if (
			config.authMode !== 'oauth' &&
			!gql.isAuthenticated() &&
			config.email &&
			config.password
		) {
			const mode = (process.env.AFFINE_LOGIN_AT_START || 'async').toLowerCase();
			// In HTTP transport mode, buildServer() is called per session, so credentials
			// must be retained for subsequent sessions. Only clear in stdio mode (single session).
			const isHttpTransport = ['sse', 'http', 'streamable'].includes(
				(process.env.MCP_TRANSPORT || 'stdio').toLowerCase()
			);
			if (mode === 'sync') {
				console.error(
					'No token/cookie; performing synchronous email/password authentication at startup...'
				);
				try {
					const { cookieHeader } = await loginWithPassword(
						config.baseUrl,
						config.email,
						config.password
					);
					gql.setCookie(cookieHeader);
					console.error('Successfully authenticated with email/password');
				} catch (e) {
					console.error('Failed to authenticate with email/password:', e);
					console.error(
						'WARNING: Continuing without authentication - some operations may fail'
					);
				} finally {
					if (!isHttpTransport) {
						config.password = undefined;
						config.email = undefined;
					}
				}
			} else {
				console.error(
					'No token/cookie; deferring email/password authentication (async after connect)...'
				);
				// Capture credentials before clearing — async login needs them.
				const loginEmail = config.email!;
				const loginPassword = config.password!;
				if (!isHttpTransport) {
					config.password = undefined;
					config.email = undefined;
				}
				// Fire-and-forget async login so stdio handshake is not delayed.
				(async () => {
					try {
						const { cookieHeader } = await loginWithPassword(
							config.baseUrl,
							loginEmail,
							loginPassword
						);
						gql.setCookie(cookieHeader);
						console.error('Successfully authenticated with email/password (async)');
					} catch (e) {
						console.error('Failed to authenticate with email/password (async):', e);
					}
				})();
			}
		}

		// Log authentication status
		if (!gql.isAuthenticated()) {
			console.error('WARNING: No authentication configured. Some operations may fail.');
			console.error('Set AFFINE_API_TOKEN or run: affine-mcp login');
		}

		gqlInstance = gql;
	}

	return gqlInstance;
}
