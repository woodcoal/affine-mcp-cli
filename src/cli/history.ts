/**
 * History CLI 模块
 * 提供文档历史记录查看的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';

/**
 * 列出文档历史
 */
const listHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
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
	]);

	if (errors.length > 0) {
		return { success: false, error: errors.join('\n') };
	}

	try {
		const { listHistoriesHandler } = await import('../core/history.js');
		const params: any = { guid: parsed['doc-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
		if (parsed.take) params.take = parsed.take;
		if (parsed.before) params.before = parsed.before;

		const result = await listHistoriesHandler(params);
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
 * History CLI 操作映射
 */
export const runHistoryCommands: Record<string, CliAction> = {
	list: {
		name: 'list',
		description: '列出文档历史记录',
		usage: 'list --doc-id <guid> [--workspace-id <id>] [--take <n>] [--before <iso-date>] [--format text|json]',
		handler: listHandler,
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID (guid)',
				required: true,
				type: 'string'
			},
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'take', description: '返回数量', type: 'number' },
			{ name: 'before', description: '此日期之前的记录 (ISO 8601)', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
