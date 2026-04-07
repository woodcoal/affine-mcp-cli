/**
 * Notification CLI 模块
 * 提供通知管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 通知命令配置
 */
const notificationsCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出通知',
		usage: 'list [--first <n>] [--offset <n>] [--unread-only] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/notifications.js'),
		coreMethod: 'listNotificationsHandler',
		paramsMapper: (parsed) => {
			const params: any = { first: parsed.first };
			if (parsed.offset) params.offset = parsed.offset;
			if (parsed['unread-only']) params.unreadOnly = true;
			return params;
		}
	},
	'read-all': {
		name: 'read-all',
		description: '标记所有通知为已读',
		usage: 'read-all [--format text|json]',
		args: [
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/notifications.js'),
		coreMethod: 'readAllNotificationsHandler',
		paramsMapper: () => {}
	}
};

/**
 * Notification CLI 操作映射
 */
export const runNotificationCommands = generateCommandMap(notificationsCommands);
