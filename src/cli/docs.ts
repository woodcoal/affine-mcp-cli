/**
 * Docs CLI 模块
 * 提供文档管理的命令行接口
 */

import { CommandConfig, generateCommandMap } from './utils.js';

/**
 * 文档命令配置
 */
const docsCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出文档',
		usage: 'list [--workspace-id <id>] [--first <n>] [--offset <n>] [--format text|json]',
		args: [
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'listDocsHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.first) params.first = parsed.first;
			if (parsed.offset) params.offset = parsed.offset;
			return params;
		}
	},
	get: {
		name: 'get',
		description: '获取文档元数据',
		usage: 'get --doc-id <id> [--workspace-id <id>] [--format text|json]',
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
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'getDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	read: {
		name: 'read',
		description: '读取文档内容',
		usage: 'read --doc-id <id> [--workspace-id <id>] [--markdown] [--format text|json]',
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
				name: 'markdown',
				short: 'm',
				description: '包含 Markdown 格式',
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'readDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.markdown) params.includeMarkdown = true;
			return params;
		}
	},
	create: {
		name: 'create',
		description: '创建文档',
		usage: 'create [--title <title>] [--content <markdown>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'title',
				short: 't',
				description: '文档标题',
				type: 'string'
			},
			{
				name: 'content',
				short: 'c',
				description: '文档内容（Markdown）',
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'createDocHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed.title) params.title = parsed.title;
			if (parsed.content) params.content = parsed.content;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	delete: {
		name: 'delete',
		description: '删除文档',
		usage: 'delete --doc-id <id> [--workspace-id <id>] [--format text|json]',
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
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'deleteDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'update-title': {
		name: 'update-title',
		description: '更新文档标题',
		usage: 'update-title --doc-id <id> --title <title> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'title',
				short: 't',
				description: '新标题',
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'updateDocTitleHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], title: parsed.title };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	duplicate: {
		name: 'duplicate',
		description: '复制文档',
		usage: 'duplicate --doc-id <id> [--title <title>] [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '源文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'title',
				short: 't',
				description: '新文档标题',
				type: 'string'
			},
			{
				name: 'parent-doc-id',
				description: '父文档 ID',
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'duplicateDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed.title) params.title = parsed.title;
			if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'create-from-template': {
		name: 'create-from-template',
		description: '从模板创建文档',
		usage: 'create-from-template --template-doc-id <id> --title <title> [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'template-doc-id',
				description: '模板文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'title',
				short: 't',
				description: '新文档标题',
				required: true,
				type: 'string'
			},
			{
				name: 'parent-doc-id',
				description: '父文档 ID',
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
		coreImport: () => import('../core/docs/crud.js'),
		coreMethod: 'createDocFromTemplateHandler',
		paramsMapper: (parsed) => {
			const params: any = { templateDocId: parsed['template-doc-id'], title: parsed.title };
			if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'export-markdown': {
		name: 'export-markdown',
		description: '导出文档为 Markdown',
		usage: 'export-markdown --doc-id <id> [--workspace-id <id>] [--frontmatter] [--format text|json]',
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
				name: 'frontmatter',
				description: '包含 frontmatter',
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
		coreImport: () => import('../core/docs/markdown.js'),
		coreMethod: 'exportDocMarkdownHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.frontmatter) params.includeFrontmatter = true;
			return params;
		}
	},
	'create-from-markdown': {
		name: 'create-from-markdown',
		description: '从 Markdown 创建文档',
		usage: 'create-from-markdown --markdown <content> [--title <title>] [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'markdown',
				short: 'm',
				description: 'Markdown 内容（使用 - 读取 stdin）',
				required: true,
				type: 'string'
			},
			{
				name: 'title',
				short: 't',
				description: '文档标题',
				type: 'string'
			},
			{
				name: 'parent-doc-id',
				description: '父文档 ID',
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
		coreImport: () => import('../core/docs/markdown.js'),
		coreMethod: 'createDocFromMarkdownHandler',
		paramsMapper: (parsed) => {
			const params: any = { markdown: parsed.markdown };
			if (parsed.title) params.title = parsed.title;
			if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'append-paragraph': {
		name: 'append-paragraph',
		description: '追加段落',
		usage: 'append-paragraph --doc-id <id> --text <text> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'text',
				short: 't',
				description: '段落文本',
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
		coreImport: () => import('../core/docs/blocks.js'),
		coreMethod: 'appendParagraphHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], text: parsed.text };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	search: {
		name: 'search',
		description: '搜索文档',
		usage: 'search --query <keyword> [--workspace-id <id>] [--limit <n>] [--match-mode <mode>] [--tag <tag>] [--format text|json]',
		args: [
			{
				name: 'query',
				short: 'q',
				description: '搜索关键词',
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
				name: 'limit',
				short: 'l',
				description: '返回数量',
				type: 'number'
			},
			{
				name: 'match-mode',
				description: '匹配模式 (substring/prefix/exact)',
				default: 'substring',
				type: 'string'
			},
			{
				name: 'tag',
				description: '按标签过滤',
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
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'searchDocsHandler',
		paramsMapper: (parsed) => {
			const params: any = { query: parsed.query };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.limit) params.limit = parsed.limit;
			if (parsed['match-mode']) params.matchMode = parsed['match-mode'];
			if (parsed.tag) params.tag = parsed.tag;
			return params;
		}
	},
	'get-by-title': {
		name: 'get-by-title',
		description: '按标题获取文档',
		usage: 'get-by-title --query <title> [--workspace-id <id>] [--limit <n>] [--format text|json]',
		args: [
			{
				name: 'query',
				short: 'q',
				description: '文档标题',
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
				name: 'limit',
				short: 'l',
				description: '返回数量',
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
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'getDocByTitleHandler',
		paramsMapper: (parsed) => {
			const params: any = { query: parsed.query };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.limit) params.limit = parsed.limit;
			return params;
		}
	},
	tree: {
		name: 'tree',
		description: '获取工作区树',
		usage: 'tree [--workspace-id <id>] [--depth <n>] [--format text|json]',
		args: [
			{
				name: 'workspace-id',
				short: 'w',
				description: '工作区 ID',
				type: 'string'
			},
			{
				name: 'depth',
				short: 'd',
				description: '深度限制',
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
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'listWorkspaceTreeHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.depth) params.depth = parsed.depth;
			return params;
		}
	},
	orphan: {
		name: 'orphan',
		description: '获取孤立文档',
		usage: 'orphan [--workspace-id <id>] [--format text|json]',
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
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'getOrphanDocsHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	children: {
		name: 'children',
		description: '获取子文档',
		usage: 'children --doc-id <id> [--workspace-id <id>] [--format text|json]',
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
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'listChildrenHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	backlinks: {
		name: 'backlinks',
		description: '获取反向链接',
		usage: 'backlinks --doc-id <id> [--workspace-id <id>] [--format text|json]',
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
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/docs/search.js'),
		coreMethod: 'listBacklinksHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	move: {
		name: 'move',
		description: '移动文档',
		usage: 'move --doc-id <id> --to-parent-doc-id <id> [--from-parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'to-parent-doc-id',
				description: '目标父文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'from-parent-doc-id',
				description: '源父文档 ID',
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
		coreImport: () => import('../core/docs/blocks.js'),
		coreMethod: 'moveDocHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				toParentDocId: parsed['to-parent-doc-id']
			};
			if (parsed['from-parent-doc-id']) params.fromParentDocId = parsed['from-parent-doc-id'];
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	publish: {
		name: 'publish',
		description: '发布文档',
		usage: 'publish --doc-id <id> [--workspace-id <id>] [--mode Page|Edgeless] [--format text|json]',
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
				name: 'mode',
				description: '模式 (Page/Edgeless)',
				default: 'Page',
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
		coreImport: () => import('../core/docs/publish.js'),
		coreMethod: 'publishDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed.mode) params.mode = parsed.mode;
			return params;
		}
	},
	revoke: {
		name: 'revoke',
		description: '取消发布文档',
		usage: 'revoke --doc-id <id> [--workspace-id <id>] [--format text|json]',
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
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		],
		coreImport: () => import('../core/docs/publish.js'),
		coreMethod: 'revokeDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'append-block': {
		name: 'append-block',
		description: '追加文档块',
		usage: 'append-block --doc-id <id> --type <type> [--text <text>] [--url <url>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'type',
				short: 't',
				description: '块类型',
				required: true,
				type: 'string'
			},
			{
				name: 'text',
				description: '文本内容',
				type: 'string'
			},
			{
				name: 'url',
				description: 'URL',
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
		coreImport: () => import('../core/docs/blocks.js'),
		coreMethod: 'appendBlockHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], type: parsed.type };
			if (parsed.text) params.text = parsed.text;
			if (parsed.url) params.url = parsed.url;
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'cleanup-orphan-embeds': {
		name: 'cleanup-orphan-embeds',
		description: '清理孤立的嵌入文档',
		usage: 'cleanup-orphan-embeds --doc-id <id> [--workspace-id <id>] [--dry-run] [--format text|json]',
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
				name: 'dry-run',
				description: '干运行模式',
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
		coreImport: () => import('../core/docs/blocks.js'),
		coreMethod: 'cleanupOrphanEmbedsHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'] };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed['dry-run']) params.dryRun = true;
			return params;
		}
	},
	'find-and-replace': {
		name: 'find-and-replace',
		description: '查找和替换文本',
		usage: 'find-and-replace --doc-id <id> --search <text> --replace <text> [--workspace-id <id>] [--match-all] [--dry-run] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'search',
				short: 's',
				description: '搜索文本',
				required: true,
				type: 'string'
			},
			{
				name: 'replace',
				short: 'r',
				description: '替换文本',
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
				name: 'match-all',
				description: '匹配所有',
				type: 'boolean'
			},
			{
				name: 'dry-run',
				description: '干运行模式',
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
		coreImport: () => import('../core/docs/blocks.js'),
		coreMethod: 'findAndReplaceHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				search: parsed.search,
				replace: parsed.replace
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed['match-all']) params.matchAll = true;
			if (parsed['dry-run']) params.dryRun = true;
			return params;
		}
	},
	'batch-create': {
		name: 'batch-create',
		description: '批量创建文档',
		usage: 'batch-create --docs <json> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'docs',
				short: 'd',
				description: '文档数组 (JSON 格式)',
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
		coreImport: () => import('../core/docs/markdown.js'),
		coreMethod: 'batchCreateDocsHandler',
		paramsMapper: (parsed) => {
			const params: any = { docs: JSON.parse(parsed.docs) };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'append-markdown': {
		name: 'append-markdown',
		description: '追加 Markdown 内容',
		usage: 'append-markdown --doc-id <id> --markdown <content> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'markdown',
				short: 'm',
				description: 'Markdown 内容（使用 - 读取 stdin）',
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
		coreImport: () => import('../core/docs/markdown.js'),
		coreMethod: 'appendMarkdownHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], markdown: parsed.markdown };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'replace-with-markdown': {
		name: 'replace-with-markdown',
		description: '替换为 Markdown 内容',
		usage: 'replace-with-markdown --doc-id <id> --markdown <content> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'markdown',
				short: 'm',
				description: 'Markdown 内容（使用 - 读取 stdin）',
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
		coreImport: () => import('../core/docs/markdown.js'),
		coreMethod: 'replaceDocWithMarkdownHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], markdown: parsed.markdown };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'tags-list': {
		name: 'tags-list',
		description: '列出所有标签',
		usage: 'tags-list [--workspace-id <id>] [--format text|json]',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'listTagsHandler',
		paramsMapper: (parsed) => {
			const params: any = {};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'tags-docs': {
		name: 'tags-docs',
		description: '按标签列出文档',
		usage: 'tags-docs --tag <name> [--workspace-id <id>] [--ignore-case] [--format text|json]',
		args: [
			{
				name: 'tag',
				short: 't',
				description: '标签名称',
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
				name: 'ignore-case',
				description: '忽略大小写',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'listDocsByTagHandler',
		paramsMapper: (parsed) => {
			const params: any = { tag: parsed.tag };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			if (parsed['ignore-case']) params.ignoreCase = true;
			return params;
		}
	},
	'tags-create': {
		name: 'tags-create',
		description: '创建标签',
		usage: 'tags-create --tag <name> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'tag',
				short: 't',
				description: '标签名称',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'createTagHandler',
		paramsMapper: (parsed) => {
			const params: any = { tag: parsed.tag };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'tags-add': {
		name: 'tags-add',
		description: '添加标签到文档',
		usage: 'tags-add --doc-id <id> --tag <name> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'tag',
				short: 't',
				description: '标签名称',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'addTagToDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], tag: parsed.tag };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'tags-remove': {
		name: 'tags-remove',
		description: '从文档移除标签',
		usage: 'tags-remove --doc-id <id> --tag <name> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'tag',
				short: 't',
				description: '标签名称',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'removeTagFromDocHandler',
		paramsMapper: (parsed) => {
			const params: any = { docId: parsed['doc-id'], tag: parsed.tag };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'tags-get': {
		name: 'tags-get',
		description: '按标签获取文档',
		usage: 'tags-get --tag <name> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'tag',
				short: 't',
				description: '标签名称',
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
		coreImport: () => import('../core/docs/tags.js'),
		coreMethod: 'getDocsByTagHandler',
		paramsMapper: (parsed) => {
			const params: any = { tag: parsed.tag };
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-add-row': {
		name: 'database-add-row',
		description: '添加数据库行',
		usage: 'database-add-row --doc-id <id> --database-block-id <id> --cells <json> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'cells',
				description: '单元格数据 (JSON 格式)',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'addDatabaseRowHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id'],
				cells: JSON.parse(parsed.cells)
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-delete-row': {
		name: 'database-delete-row',
		description: '删除数据库行',
		usage: 'database-delete-row --doc-id <id> --database-block-id <id> --row-block-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'row-block-id',
				description: '行块 ID',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'deleteDatabaseRowHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id'],
				rowBlockId: parsed['row-block-id']
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-read-cells': {
		name: 'database-read-cells',
		description: '读取数据库单元格',
		usage: 'database-read-cells --doc-id <id> --database-block-id <id> [--row-block-ids <ids>] [--columns <columns>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'row-block-ids',
				description: '行块 ID 列表 (逗号分隔)',
				type: 'string'
			},
			{
				name: 'columns',
				description: '列名列表 (逗号分隔)',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'readDatabaseCellsHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id']
			};
			if (parsed['row-block-ids']) params.rowBlockIds = parsed['row-block-ids'].split(',');
			if (parsed.columns) params.columns = parsed.columns.split(',');
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-read-columns': {
		name: 'database-read-columns',
		description: '读取数据库列',
		usage: 'database-read-columns --doc-id <id> --database-block-id <id> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'readDatabaseColumnsHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id']
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-update-cell': {
		name: 'database-update-cell',
		description: '更新数据库单元格',
		usage: 'database-update-cell --doc-id <id> --database-block-id <id> --row-block-id <id> --column <name> --value <value> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'row-block-id',
				description: '行块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'column',
				description: '列名',
				required: true,
				type: 'string'
			},
			{
				name: 'value',
				description: '单元格值',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'updateDatabaseCellHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id'],
				rowBlockId: parsed['row-block-id'],
				column: parsed.column,
				value: parsed.value
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-update-row': {
		name: 'database-update-row',
		description: '更新数据库行',
		usage: 'database-update-row --doc-id <id> --database-block-id <id> --row-block-id <id> --cells <json> [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'row-block-id',
				description: '行块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'cells',
				description: '单元格数据 (JSON 格式)',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'updateDatabaseRowHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id'],
				rowBlockId: parsed['row-block-id'],
				cells: JSON.parse(parsed.cells)
			};
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	},
	'database-add-column': {
		name: 'database-add-column',
		description: '添加数据库列',
		usage: 'database-add-column --doc-id <id> --database-block-id <id> --name <name> --type <type> [--options <options>] [--workspace-id <id>] [--format text|json]',
		args: [
			{
				name: 'doc-id',
				short: 'd',
				description: '文档 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'database-block-id',
				description: '数据库块 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'name',
				description: '列名',
				required: true,
				type: 'string'
			},
			{
				name: 'type',
				description: '列类型',
				required: true,
				type: 'string'
			},
			{
				name: 'options',
				description: '选项列表 (逗号分隔)',
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
		coreImport: () => import('../core/docs/database.js'),
		coreMethod: 'addDatabaseColumnHandler',
		paramsMapper: (parsed) => {
			const params: any = {
				docId: parsed['doc-id'],
				databaseBlockId: parsed['database-block-id'],
				name: parsed.name,
				type: parsed.type
			};
			if (parsed.options) params.options = parsed.options.split(',');
			if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
			return params;
		}
	}
};

/**
 * Docs CLI 操作映射
 */
export const runDocsCommands = generateCommandMap(docsCommands);
