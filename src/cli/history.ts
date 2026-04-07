/**
 * History CLI 模块
 * 提供文档历史记录查看的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 历史命令配置
 */
const historyCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出文档历史记录',
		usage: 'list --doc-id <guid> [--workspace-id <id>] [--take <n>] [--before <iso-date>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID (guid)',
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
				name: 'take',
				description: '返回数量',
				type: 'number'
			},
			{
				name: 'before',
				description: '此日期之前的记录 (ISO 8601)',
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
		coreImport: () => import('../core/history.js'),
		coreMethod: 'listHistoriesHandler',
		paramsMapper: (parsed) => {
			const params: any = { guid: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.take) params.take = parsed.take;
			if (parsed.before) params.before = parsed.before;
			return params;
		}
	}
};

/**
 * History CLI 操作映射
 */
export const runHistoryCommands = generateCommandMap(historyCommands);
