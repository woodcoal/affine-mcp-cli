/**
 * Token CLI 模块
 * 提供访问令牌管理的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';

/**
 * 列出访问令牌
 */
const listHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'format',
			short: 'f',
			description: '输出格式 (text/json)',
			default: 'text',
			type: 'string'
		}
	]);

	if (errors.length > 0) {
		return { success: false, error: errors.join('\n') };
	}

	try {
		const { listAccessTokensHandler } = await import('../core/accessTokens.js');
		const result = await listAccessTokensHandler();
		const data = parseCoreResult(result);

		return {
			success: true,
			output: formatOutput(data, parsed.format as 'text' | 'json')
		};
	} catch (error: any) {
		return { success: false, error: error.message };
	}
};

/**
 * 生成访问令牌
 */
const createHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
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
	]);

	if (errors.length > 0) {
		return { success: false, error: errors.join('\n') };
	}

	try {
		const { generateAccessTokenHandler } = await import('../core/accessTokens.js');
		const params: any = { name: parsed.name };
		if (parsed['expires-at']) params.expiresAt = parsed['expires-at'];

		const result = await generateAccessTokenHandler(params);
		const data = parseCoreResult(result);

		return {
			success: true,
			output: formatOutput(data, parsed.format as 'text' | 'json')
		};
	} catch (error: any) {
		return { success: false, error: error.message };
	}
};

/**
 * 撤销访问令牌
 */
const revokeHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
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
	]);

	if (errors.length > 0) {
		return { success: false, error: errors.join('\n') };
	}

	try {
		const { revokeAccessTokenHandler } = await import('../core/accessTokens.js');
		const result = await revokeAccessTokenHandler({ id: parsed.id });
		const data = parseCoreResult(result);

		return {
			success: true,
			output: formatOutput(data, parsed.format as 'text' | 'json')
		};
	} catch (error: any) {
		return { success: false, error: error.message };
	}
};

/**
 * Token CLI 操作映射
 */
export const runTokenCommands: Record<string, CliAction> = {
	list: {
		name: 'list',
		description: '列出访问令牌',
		usage: 'list [--format text|json]',
		handler: listHandler,
		args: [
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	create: {
		name: 'create',
		description: '生成新的访问令牌',
		usage: 'create --name <name> [--expires-at <iso-date>] [--format text|json]',
		handler: createHandler,
		args: [
			{ name: 'name', short: 'n', description: '令牌名称', required: true, type: 'string' },
			{ name: 'expires-at', description: '过期时间 (ISO 8601)', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	revoke: {
		name: 'revoke',
		description: '撤销访问令牌',
		usage: 'revoke --id <token-id> [--format text|json]',
		handler: revokeHandler,
		args: [
			{ name: 'id', short: 'i', description: '令牌 ID', required: true, type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
