/**
 * User CLI 模块
 * 提供用户管理的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';

/**
 * 获取当前用户
 */
const currentHandler: CommandHandler = async (args) => {
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
		const { currentUserHandler } = await import('../core/user.js');
		const result = await currentUserHandler();
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
 * 更新用户资料
 */
const updateProfileHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'name',
			short: 'n',
			description: '显示名称',
			type: 'string'
		},
		{
			name: 'avatar-url',
			description: '头像 URL',
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
		const { updateProfileHandler: handler } = await import('../core/userCRUD.js');
		const params: any = {};
		if (parsed.name) params.name = parsed.name;
		if (parsed['avatar-url']) params.avatarUrl = parsed['avatar-url'];

		const result = await handler(params);
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
 * 更新用户设置
 */
const updateSettingsHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'receive-comment-email',
			description: '接收评论邮件通知',
			type: 'boolean'
		},
		{
			name: 'receive-invitation-email',
			description: '接收邀请邮件通知',
			type: 'boolean'
		},
		{
			name: 'receive-mention-email',
			description: '接收提及邮件通知',
			type: 'boolean'
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
		const { updateSettingsHandler: handler } = await import('../core/userCRUD.js');
		const settings: any = {};
		if (parsed['receive-comment-email'] !== undefined) {
			settings.receiveCommentEmail = parsed['receive-comment-email'];
		}
		if (parsed['receive-invitation-email'] !== undefined) {
			settings.receiveInvitationEmail = parsed['receive-invitation-email'];
		}
		if (parsed['receive-mention-email'] !== undefined) {
			settings.receiveMentionEmail = parsed['receive-mention-email'];
		}

		const result = await handler({ settings });
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
 * User CLI 操作映射
 */
export const runUserCommands: Record<string, CliAction> = {
	current: {
		name: 'current',
		description: '获取当前登录用户信息',
		usage: 'current [--format text|json]',
		handler: currentHandler,
		args: [
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'update-profile': {
		name: 'update-profile',
		description: '更新用户资料',
		usage: 'update-profile [--name <name>] [--avatar-url <url>] [--format text|json]',
		handler: updateProfileHandler,
		args: [
			{ name: 'name', short: 'n', description: '显示名称', type: 'string' },
			{ name: 'avatar-url', description: '头像 URL', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'update-settings': {
		name: 'update-settings',
		description: '更新用户设置',
		usage: 'update-settings [--receive-comment-email <bool>] [--receive-invitation-email <bool>] [--receive-mention-email <bool>] [--format text|json]',
		handler: updateSettingsHandler,
		args: [
			{ name: 'receive-comment-email', description: '接收评论邮件通知', type: 'boolean' },
			{ name: 'receive-invitation-email', description: '接收邀请邮件通知', type: 'boolean' },
			{ name: 'receive-mention-email', description: '接收提及邮件通知', type: 'boolean' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
