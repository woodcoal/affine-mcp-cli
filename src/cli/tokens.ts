/**
 * Token CLI 模块
 * 提供访问令牌管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 令牌命令配置
 */
const tokensCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出访问令牌',
		usage: 'list [--format text|json]',
		args: [
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/accessTokens.js'),
		coreMethod: 'listAccessTokensHandler',
		paramsMapper: () => {}
	},
	create: {
		name: 'create',
		description: '生成新的访问令牌',
		usage: 'create --name <name> [--expires-at <iso-date>] [--format text|json]',
		args: [
			{
				name: 'name',
				short: 'n',
				description: '令牌名称',
				required: true,
				type: 'string'
			},
			{
				name: 'expires-at',
				description: '过期时间 (ISO 8601)',
				type: 'string'
			},
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/accessTokens.js'),
		coreMethod: 'generateAccessTokenHandler',
		paramsMapper: (parsed) => {
			const params: any = { name: parsed.name };
			if (parsed['expires-at']) params.expiresAt = parsed['expires-at'];
			return params;
		}
	},
	revoke: {
		name: 'revoke',
		description: '撤销访问令牌',
		usage: 'revoke --id <token-id> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
				description: '令牌 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/accessTokens.js'),
		coreMethod: 'revokeAccessTokenHandler',
		paramsMapper: (parsed) => {
			return { id: parsed.id };
		}
	}
};

/**
 * Token CLI 操作映射
 */
export const runTokenCommands = generateCommandMap(tokensCommands);
