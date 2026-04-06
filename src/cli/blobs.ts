/**
 * Blob CLI 模块
 * 提供 Blob 存储管理的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';
import * as fs from 'fs';

/**
 * 上传 Blob
 */
const uploadHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'file',
			short: 'f',
			description: '文件路径',
			type: 'string'
		},
		{
			name: 'content',
			short: 'c',
			description: 'Base64 编码的内容或文本',
			type: 'string'
		},
		{
			name: 'filename',
			short: 'n',
			description: '文件名',
			type: 'string'
		},
		{
			name: 'content-type',
			description: 'MIME 类型',
			type: 'string'
		},
		{
			name: 'format',
			short: 'o',
			description: '输出格式 (text/json)',
			default: 'text',
			type: 'string'
		}
	]);

	if (errors.length > 0) {
		return { success: false, error: errors.join('\n') };
	}

	if (!parsed.file && !parsed.content) {
		return { success: false, error: '必须提供 --file 或 --content 参数' };
	}

	try {
		const { uploadBlobHandler } = await import('../core/blobStorage.js');
		const params: any = { workspaceId: parsed['workspace-id'] };

		if (parsed.file) {
			// 读取文件并转换为 Base64
			const fileContent = fs.readFileSync(parsed.file);
			params.content = fileContent.toString('base64');
			params.filename = parsed.filename || parsed.file.split(/[/\\]/).pop();
			if (parsed['content-type']) {
				params.contentType = parsed['content-type'];
			}
		} else if (parsed.content) {
			params.content = parsed.content;
			if (parsed.filename) params.filename = parsed.filename;
			if (parsed['content-type']) params.contentType = parsed['content-type'];
		}

		const result = await uploadBlobHandler(params);
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
 * 删除 Blob
 */
const deleteHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'key',
			short: 'k',
			description: 'Blob 键/ID',
			required: true,
			type: 'string'
		},
		{
			name: 'permanently',
			short: 'p',
			description: '永久删除',
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
		const { deleteBlobHandler } = await import('../core/blobStorage.js');
		const params: any = { workspaceId: parsed['workspace-id'], key: parsed.key };
		if (parsed.permanently) params.permanently = true;

		const result = await deleteBlobHandler(params);
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
 * 清理 Blob
 */
const cleanupHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { cleanupBlobsHandler } = await import('../core/blobStorage.js');
		const params = { workspaceId: parsed['workspace-id'] };

		const result = await cleanupBlobsHandler(params);
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
 * Blob CLI 操作映射
 */
export const runBlobCommands: Record<string, CliAction> = {
	upload: {
		name: 'upload',
		description: '上传文件到工作区存储',
		usage: 'upload --workspace-id <id> --file <path> [--filename <name>] [--content-type <mime>] [--format text|json]',
		handler: uploadHandler,
		args: [
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				required: true,
				type: 'string'
			},
			{ name: 'file', short: 'f', description: '文件路径', type: 'string' },
			{ name: 'content', short: 'c', description: 'Base64 编码的内容', type: 'string' },
			{ name: 'filename', short: 'n', description: '文件名', type: 'string' },
			{ name: 'content-type', description: 'MIME 类型', type: 'string' },
			{ name: 'format', short: 'o', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	delete: {
		name: 'delete',
		description: '删除 Blob',
		usage: 'delete --workspace-id <id> --key <blob-key> [--permanently] [--format text|json]',
		handler: deleteHandler,
		args: [
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				required: true,
				type: 'string'
			},
			{ name: 'key', short: 'k', description: 'Blob 键/ID', required: true, type: 'string' },
			{ name: 'permanently', short: 'p', description: '永久删除', type: 'boolean' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	cleanup: {
		name: 'cleanup',
		description: '清理已删除的 Blob',
		usage: 'cleanup --workspace-id <id> [--format text|json]',
		handler: cleanupHandler,
		args: [
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				required: true,
				type: 'string'
			},
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
