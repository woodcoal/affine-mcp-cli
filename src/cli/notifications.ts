/**
 * Notification CLI 模块
 * 提供通知管理的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';

/**
 * 列出通知
 */
const listHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'first',
			description: '返回数量',
			default: '20',
			type: 'number'
		},
		{
			name: 'offset',
			description: '偏移量',
			type: 'number'
		},
		{
			name: 'unread-only',
			short: 'u',
			description: '仅未读通知',
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
		const { listNotificationsHandler } = await import('../core/notifications.js');
		const params: any = { first: parsed.first };
		if (parsed.offset) params.offset = parsed.offset;
		if (parsed['unread-only']) params.unreadOnly = true;

		const result = await listNotificationsHandler(params);
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
 * 标记所有通知已读
 */
const readAllHandler: CommandHandler = async (args) => {
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
		const { readAllNotificationsHandler } = await import('../core/notifications.js');
		const result = await readAllNotificationsHandler();
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
 * Notification CLI 操作映射
 */
export const runNotificationCommands: Record<string, CliAction> = {
	list: {
		name: 'list',
		description: '列出通知',
		usage: 'list [--first <n>] [--offset <n>] [--unread-only] [--format text|json]',
		handler: listHandler,
		args: [
			{ name: 'first', description: '返回数量', default: '20', type: 'number' },
			{ name: 'offset', description: '偏移量', type: 'number' },
			{ name: 'unread-only', short: 'u', description: '仅未读通知', type: 'boolean' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'read-all': {
		name: 'read-all',
		description: '标记所有通知为已读',
		usage: 'read-all [--format text|json]',
		handler: readAllHandler,
		args: [
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
