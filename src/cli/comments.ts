/**
 * Comment CLI 模块
 * 提供评论管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 评论命令配置
 */
const commentsCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出文档评论',
		usage: 'list --doc-id <id> [--workspace-id <id>] [--first <n>] [--offset <n>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				type: 'string'
			},
			{
				name: 'first',
				description: '返回数量',
				type: 'number'
			},
			{
				name: 'offset',
				description: '偏移量',
				type: 'number'
			},
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/comments.js'),
		coreMethod: 'listCommentsHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.first) params.first = parsed.first;
			if (parsed.offset) params.offset = parsed.offset;
			return params;
		}
	},
	create: {
		name: 'create',
		description: '创建评论',
		usage: 'create --doc-id <id> --content <text> [--workspace-id <id>] [--doc-title <title>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'content',
				short: 'c',
				description: '评论内容',
				required: true,
				type: 'string'
			},
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				type: 'string'
			},
			{
				name: 'doc-title',
				description: '文档标题',
				type: 'string'
			},
			{
				name: 'doc-mode',
				description: '文档模式 (Page/Edgeless)',
				default: 'page',
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
		coreImport: () => import('../core/comments.js'),
		coreMethod: 'createCommentHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], content: parsed.content };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed['doc-title']) params.docTitle = parsed['doc-title'];
			if (parsed['doc-mode']) params.docMode = parsed['doc-mode'];
			return params;
		}
	},
	update: {
		name: 'update',
		description: '更新评论',
		usage: 'update --id <id> --content <text> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
				description: '评论 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'content',
				short: 'c',
				description: '新评论内容',
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
		coreImport: () => import('../core/comments.js'),
		coreMethod: 'updateCommentHandler',
		paramsMapper: (parsed) => {
			return { id: parsed.id, content: parsed.content };
		}
	},
	delete: {
		name: 'delete',
		description: '删除评论',
		usage: 'delete --id <id> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
				description: '评论 ID',
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
		coreImport: () => import('../core/comments.js'),
		coreMethod: 'deleteCommentHandler',
		paramsMapper: (parsed) => {
			return { id: parsed.id };
		}
	},
	resolve: {
		name: 'resolve',
		description: '解决/取消解决评论',
		usage: 'resolve --id <id> --resolved <true|false> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
				description: '评论 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'resolved',
				short: 'r',
				description: '是否已解决 (true/false)',
				required: true,
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
		coreImport: () => import('../core/comments.js'),
		coreMethod: 'resolveCommentHandler',
		paramsMapper: (parsed) => {
			return { id: parsed.id, resolved: parsed.resolved };
		}
	}
};

/**
 * Comment CLI 操作映射
 */
export const runCommentCommands = generateCommandMap(commentsCommands);
