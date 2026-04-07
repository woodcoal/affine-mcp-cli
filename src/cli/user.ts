/**
 * User CLI 模块
 * 提供用户管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 用户命令配置
 */
const userCommands: Record<string, CommandConfig> = {
	current: {
		name: 'current',
		description: '获取当前登录用户信息',
		usage: 'current [--format text|json]',
		args: [
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/user.js'),
		coreMethod: 'currentUserHandler',
		paramsMapper: () => {}
	},
	'update-profile': {
		name: 'update-profile',
		description: '更新用户资料',
		usage: 'update-profile [--name <name>] [--avatar-url <url>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/userCRUD.js'),
		coreMethod: 'updateProfileHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed.name) params.name = parsed.name;
			if (parsed['avatar-url']) params.avatarUrl = parsed['avatar-url'];
			return params;
		}
	},
	'update-settings': {
		name: 'update-settings',
		description: '更新用户设置',
		usage: 'update-settings [--receive-comment-email <bool>] [--receive-invitation-email <bool>] [--receive-mention-email <bool>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/userCRUD.js'),
		coreMethod: 'updateSettingsHandler',
		paramsMapper: (parsed) => {
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
			return { settings };
		}
	}
};

/**
 * User CLI 操作映射
 */
export const runUserCommands = generateCommandMap(userCommands);
