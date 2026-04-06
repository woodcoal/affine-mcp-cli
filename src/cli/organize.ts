/**
 * Organize CLI 模块
 * 提供收藏集和文件夹管理的命令行接口
 */

import { CliAction, CommandHandler, formatOutput, parseArgs, parseCoreResult } from './utils.js';

/**
 * 列表收藏集
 */
const listCollectionsHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { listCollectionsHandler: handler } = await import('../core/organize.js');
		const params: any = {};
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 获取收藏集
 */
const getCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'collection-id',
			short: 'c',
			description: '收藏集 ID',
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
		const { getCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { collectionId: parsed['collection-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 创建收藏集
 */
const createCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'name',
			short: 'n',
			description: '收藏集名称',
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
		const { createCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { name: parsed.name };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 更新收藏集
 */
const updateCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'collection-id',
			short: 'c',
			description: '收藏集 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'name',
			short: 'n',
			description: '新名称',
			type: 'string'
		},
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { updateCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { collectionId: parsed['collection-id'] };
		if (parsed.name) params.name = parsed.name;
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 删除收藏集
 */
const deleteCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'collection-id',
			short: 'c',
			description: '收藏集 ID',
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
		const { deleteCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { collectionId: parsed['collection-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 添加文档到收藏集
 */
const addDocToCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'collection-id',
			short: 'c',
			description: '收藏集 ID',
			required: true,
			type: 'string'
		},
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
		const { addDocToCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { collectionId: parsed['collection-id'], docId: parsed['doc-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 从收藏集移除文档
 */
const removeDocFromCollectionHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'collection-id',
			short: 'c',
			description: '收藏集 ID',
			required: true,
			type: 'string'
		},
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
		const { removeDocFromCollectionHandler: handler } = await import('../core/organize.js');
		const params: any = { collectionId: parsed['collection-id'], docId: parsed['doc-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 列出组织节点
 */
const listNodesHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { listOrganizeNodesHandler: handler } = await import('../core/organize.js');
		const params: any = {};
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 创建文件夹
 */
const createFolderHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'name',
			short: 'n',
			description: '文件夹名称',
			required: true,
			type: 'string'
		},
		{
			name: 'parent-id',
			description: '父文件夹 ID',
			type: 'string'
		},
		{
			name: 'index',
			description: '排序索引',
			type: 'string'
		},
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { createFolderHandler: handler } = await import('../core/organize.js');
		const params: any = { name: parsed.name };
		if (parsed['parent-id']) params.parentId = parsed['parent-id'];
		if (parsed.index) params.index = parsed.index;
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 重命名文件夹
 */
const renameFolderHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'folder-id',
			short: 'f',
			description: '文件夹 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'name',
			short: 'n',
			description: '新名称',
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
		const { renameFolderHandler: handler } = await import('../core/organize.js');
		const params: any = { folderId: parsed['folder-id'], name: parsed.name };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 删除文件夹
 */
const deleteFolderHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'folder-id',
			short: 'f',
			description: '文件夹 ID',
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
		const { deleteFolderHandler: handler } = await import('../core/organize.js');
		const params: any = { folderId: parsed['folder-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 移动节点
 */
const moveNodeHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'node-id',
			short: 'n',
			description: '节点 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'parent-id',
			description: '目标父节点 ID',
			type: 'string'
		},
		{
			name: 'index',
			description: '排序索引',
			type: 'string'
		},
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { moveOrganizeNodeHandler: handler } = await import('../core/organize.js');
		const params: any = { nodeId: parsed['node-id'] };
		if (parsed['parent-id']) params.parentId = parsed['parent-id'];
		if (parsed.index) params.index = parsed.index;
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 添加链接
 */
const addLinkHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'folder-id',
			description: '文件夹 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'type',
			short: 't',
			description: '链接类型 (doc/tag/collection)',
			required: true,
			type: 'string'
		},
		{
			name: 'target-id',
			description: '目标 ID',
			required: true,
			type: 'string'
		},
		{
			name: 'index',
			description: '排序索引',
			type: 'string'
		},
		{
			name: 'workspace-id',
			short: 'w',
			description: '工作区 ID',
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
		const { addOrganizeLinkHandler: handler } = await import('../core/organize.js');
		const params: any = {
			folderId: parsed['folder-id'],
			type: parsed.type as 'doc' | 'tag' | 'collection',
			targetId: parsed['target-id']
		};
		if (parsed.index) params.index = parsed.index;
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * 删除链接
 */
const deleteLinkHandler: CommandHandler = async (args) => {
	const { parsed, errors } = parseArgs(args, [
		{
			name: 'node-id',
			short: 'n',
			description: '节点 ID',
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
		const { deleteOrganizeLinkHandler: handler } = await import('../core/organize.js');
		const params: any = { nodeId: parsed['node-id'] };
		if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];

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
 * Organize CLI 操作映射
 */
export const runOrganizeCommands: Record<string, CliAction> = {
	'list-collections': {
		name: 'list-collections',
		description: '列出收藏集',
		usage: 'list-collections [--workspace-id <id>] [--format text|json]',
		handler: listCollectionsHandler
	},
	'get-collection': {
		name: 'get-collection',
		description: '获取收藏集详情',
		usage: 'get-collection --collection-id <id> [--workspace-id <id>] [--format text|json]',
		handler: getCollectionHandler,
		args: [
			{
				name: 'collection-id',
				short: 'c',
				description: '收藏集 ID',
				required: true,
				type: 'string'
			},
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'create-collection': {
		name: 'create-collection',
		description: '创建收藏集',
		usage: 'create-collection --name <name> [--workspace-id <id>] [--format text|json]',
		handler: createCollectionHandler,
		args: [
			{ name: 'name', short: 'n', description: '收藏集名称', required: true, type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'update-collection': {
		name: 'update-collection',
		description: '更新收藏集',
		usage: 'update-collection --collection-id <id> [--name <name>] [--workspace-id <id>] [--format text|json]',
		handler: updateCollectionHandler,
		args: [
			{
				name: 'collection-id',
				short: 'c',
				description: '收藏集 ID',
				required: true,
				type: 'string'
			},
			{ name: 'name', short: 'n', description: '新名称', type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'delete-collection': {
		name: 'delete-collection',
		description: '删除收藏集',
		usage: 'delete-collection --collection-id <id> [--workspace-id <id>] [--format text|json]',
		handler: deleteCollectionHandler,
		args: [
			{
				name: 'collection-id',
				short: 'c',
				description: '收藏集 ID',
				required: true,
				type: 'string'
			},
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'add-doc': {
		name: 'add-doc',
		description: '添加文档到收藏集',
		usage: 'add-doc --collection-id <id> --doc-id <id> [--workspace-id <id>] [--format text|json]',
		handler: addDocToCollectionHandler,
		args: [
			{
				name: 'collection-id',
				short: 'c',
				description: '收藏集 ID',
				required: true,
				type: 'string'
			},
			{ name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'remove-doc': {
		name: 'remove-doc',
		description: '从收藏集移除文档',
		usage: 'remove-doc --collection-id <id> --doc-id <id> [--workspace-id <id>] [--format text|json]',
		handler: removeDocFromCollectionHandler,
		args: [
			{
				name: 'collection-id',
				short: 'c',
				description: '收藏集 ID',
				required: true,
				type: 'string'
			},
			{ name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'list-nodes': {
		name: 'list-nodes',
		description: '列出组织节点',
		usage: 'list-nodes [--workspace-id <id>] [--format text|json]',
		handler: listNodesHandler
	},
	'create-folder': {
		name: 'create-folder',
		description: '创建文件夹',
		usage: 'create-folder --name <name> [--parent-id <id>] [--index <idx>] [--workspace-id <id>] [--format text|json]',
		handler: createFolderHandler,
		args: [
			{ name: 'name', short: 'n', description: '文件夹名称', required: true, type: 'string' },
			{ name: 'parent-id', description: '父文件夹 ID', type: 'string' },
			{ name: 'index', description: '排序索引', type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'rename-folder': {
		name: 'rename-folder',
		description: '重命名文件夹',
		usage: 'rename-folder --folder-id <id> --name <name> [--workspace-id <id>] [--format text|json]',
		handler: renameFolderHandler,
		args: [
			{
				name: 'folder-id',
				short: 'f',
				description: '文件夹 ID',
				required: true,
				type: 'string'
			},
			{ name: 'name', short: 'n', description: '新名称', required: true, type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'delete-folder': {
		name: 'delete-folder',
		description: '删除文件夹',
		usage: 'delete-folder --folder-id <id> [--workspace-id <id>] [--format text|json]',
		handler: deleteFolderHandler,
		args: [
			{
				name: 'folder-id',
				short: 'f',
				description: '文件夹 ID',
				required: true,
				type: 'string'
			},
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'move-node': {
		name: 'move-node',
		description: '移动组织节点',
		usage: 'move-node --node-id <id> [--parent-id <id>] [--index <idx>] [--workspace-id <id>] [--format text|json]',
		handler: moveNodeHandler,
		args: [
			{ name: 'node-id', short: 'n', description: '节点 ID', required: true, type: 'string' },
			{ name: 'parent-id', description: '目标父节点 ID', type: 'string' },
			{ name: 'index', description: '排序索引', type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'add-link': {
		name: 'add-link',
		description: '添加组织链接',
		usage: 'add-link --folder-id <id> --type <type> --target-id <id> [--index <idx>] [--workspace-id <id>] [--format text|json]',
		handler: addLinkHandler,
		args: [
			{ name: 'folder-id', description: '文件夹 ID', required: true, type: 'string' },
			{
				name: 'type',
				short: 't',
				description: '链接类型 (doc/tag/collection)',
				required: true,
				type: 'string'
			},
			{ name: 'target-id', description: '目标 ID', required: true, type: 'string' },
			{ name: 'index', description: '排序索引', type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	},
	'delete-link': {
		name: 'delete-link',
		description: '删除组织链接',
		usage: 'delete-link --node-id <id> [--workspace-id <id>] [--format text|json]',
		handler: deleteLinkHandler,
		args: [
			{ name: 'node-id', short: 'n', description: '节点 ID', required: true, type: 'string' },
			{ name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
			{ name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
		]
	}
};
