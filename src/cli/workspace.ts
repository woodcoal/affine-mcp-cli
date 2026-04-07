/**
 * Workspace CLI 模块
 * 提供工作区管理的命令行接口
 */

import { CommandConfig, generateCommandMap, ArgDef } from './utils.js';

/**
 * 工作区命令配置
 */
const workspaceCommands: Record<string, CommandConfig> = {
	list: {
		name: 'list',
		description: '列出所有工作区',
		usage: 'list [--format text|json]',
		args: [
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		] as ArgDef[],
		coreImport: () => import('../core/workspace.js'),
		coreMethod: 'listWorkspacesHandler'
	},
	get: {
		name: 'get',
		description: '获取工作区详情',
		usage: 'get --id <workspace-id> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
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
		] as ArgDef[],
		coreImport: () => import('../core/workspace.js'),
		coreMethod: 'getWorkspaceHandler',
		paramsMapper: (parsed: any) => ({ id: parsed.id })
	},
	create: {
		name: 'create',
		description: '创建新工作区',
		usage: 'create --name <name> [--avatar <emoji>] [--format text|json]',
		args: [
			{
				name: 'name',
				short: 'n',
				description: '工作区名称',
				required: true,
				type: 'string'
			},
			{
				name: 'avatar',
				short: 'a',
				description: '头像（emoji 或 URL）',
				type: 'string'
			},
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		] as ArgDef[],
		coreImport: () => import('../core/workspace.js'),
		coreMethod: 'createWorkspaceHandler',
		paramsMapper: (parsed: any) => {
			const params: any = { name: parsed.name };
			if (parsed.avatar) params.avatar = parsed.avatar;
			return params;
		}
	},
	update: {
		name: 'update',
		description: '更新工作区设置',
		usage: 'update --id <workspace-id> [--public] [--ai] [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
				description: '工作区 ID',
				required: true,
				type: 'string'
			},
			{
				name: 'public',
				description: '是否公开 (true/false)',
				type: 'boolean'
			},
			{
				name: 'ai',
				description: '启用 AI 功能 (true/false)',
				type: 'boolean'
			},
			{
				name: 'format',
				short: 'f',
				description: '输出格式 (text/json)',
				default: 'text',
				type: 'string'
			}
		] as ArgDef[],
		coreImport: () => import('../core/workspace.js'),
		coreMethod: 'updateWorkspaceHandler',
		paramsMapper: (parsed: any) => {
			const params: any = { id: parsed.id };
			if (parsed.public !== undefined) params.public = parsed.public;
			if (parsed.ai !== undefined) params.enableAi = parsed.ai;
			return params;
		}
	},
	delete: {
		name: 'delete',
		description: '删除工作区',
		usage: 'delete --id <workspace-id> [--format text|json]',
		args: [
			{
				name: 'id',
				short: 'i',
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
		] as ArgDef[],
		coreImport: () => import('../core/workspace.js'),
		coreMethod: 'deleteWorkspaceHandler',
		paramsMapper: (parsed: any) => ({ id: parsed.id })
	}
};

/**
 * 工作区 CLI 操作映射
 */
export const runWorkspaceCommands = generateCommandMap(workspaceCommands);