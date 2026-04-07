/**
 * Organize CLI 模块
 * 提供收藏集和文件夹管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 组织命令配置
 */
const organizeCommands: Record<string, CommandConfig> = {
	'list-collections': {
		name: 'list-collections',
		description: '列出收藏集',
		usage: 'list-collections [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'listCollectionsHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'get-collection': {
		name: 'get-collection',
		description: '获取收藏集详情',
		usage: 'get-collection --collection-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'getCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { collectionId: parsed['collection-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'create-collection': {
		name: 'create-collection',
		description: '创建收藏集',
		usage: 'create-collection --name <name> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'createCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { name: parsed.name };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'update-collection': {
		name: 'update-collection',
		description: '更新收藏集',
		usage: 'update-collection --collection-id <id> [--name <name>] [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'updateCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { collectionId: parsed['collection-id'] };
			if (parsed.name) params.name = parsed.name;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'delete-collection': {
		name: 'delete-collection',
		description: '删除收藏集',
		usage: 'delete-collection --collection-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'deleteCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { collectionId: parsed['collection-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'add-doc': {
		name: 'add-doc',
		description: '添加文档到收藏集',
		usage: 'add-doc --collection-id <id> --doc-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'addDocToCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { collectionId: parsed['collection-id'], docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'remove-doc': {
		name: 'remove-doc',
		description: '从收藏集移除文档',
		usage: 'remove-doc --collection-id <id> --doc-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'removeDocFromCollectionHandler',
		paramsMapper: (parsed) => {
			const params: any = { collectionId: parsed['collection-id'], docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'list-nodes': {
		name: 'list-nodes',
		description: '列出组织节点',
		usage: 'list-nodes [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'listOrganizeNodesHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'create-folder': {
		name: 'create-folder',
		description: '创建文件夹',
		usage: 'create-folder --name <name> [--parent-id <id>] [--index <idx>] [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'createFolderHandler',
		paramsMapper: (parsed) => {
			const params: any = { name: parsed.name };
			if (parsed['parent-id']) params.parentId = parsed['parent-id'];
			if (parsed.index) params.index = parsed.index;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'rename-folder': {
		name: 'rename-folder',
		description: '重命名文件夹',
		usage: 'rename-folder --folder-id <id> --name <name> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'renameFolderHandler',
		paramsMapper: (parsed) => {
			const params: any = { folderId: parsed['folder-id'], name: parsed.name };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'delete-folder': {
		name: 'delete-folder',
		description: '删除文件夹',
		usage: 'delete-folder --folder-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'deleteFolderHandler',
		paramsMapper: (parsed) => {
			const params: any = { folderId: parsed['folder-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'move-node': {
		name: 'move-node',
		description: '移动组织节点',
		usage: 'move-node --node-id <id> [--parent-id <id>] [--index <idx>] [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'moveOrganizeNodeHandler',
		paramsMapper: (parsed) => {
			const params: any = { nodeId: parsed['node-id'] };
			if (parsed['parent-id']) params.parentId = parsed['parent-id'];
			if (parsed.index) params.index = parsed.index;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'add-link': {
		name: 'add-link',
		description: '添加组织链接',
		usage: 'add-link --folder-id <id> --type <type> --target-id <id> [--index <idx>] [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'addOrganizeLinkHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				folderId: parsed['folder-id'],
				type: parsed.type as 'doc' | 'tag' | 'collection',
				targetId: parsed['target-id']
			};
			if (parsed.index) params.index = parsed.index;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'delete-link': {
		name: 'delete-link',
		description: '删除组织链接',
		usage: 'delete-link --node-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
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
		],
		coreImport: () => import('../core/organize.js'),
		coreMethod: 'deleteOrganizeLinkHandler',
		paramsMapper: (parsed) => {
			const params: any = { nodeId: parsed['node-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	}
};

/**
 * Organize CLI 操作映射
 */
export const runOrganizeCommands = generateCommandMap(organizeCommands);
