/**
 * Workspace CLI 模块
 * 提供工作区管理的命令行接口
 */

import {
  CliAction,
  CommandHandler,
  formatOutput,
  parseArgs,
  parseCoreResult
} from './utils.js';

/**
 * 列出所有工作区
 */
const listHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
    const { listWorkspacesHandler } = await import('../core/workspace.js');
    const result = await listWorkspacesHandler();
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
 * 获取指定工作区详情
 */
const getHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { getWorkspaceHandler } = await import('../core/workspace.js');
    const result = await getWorkspaceHandler({ id: parsed.id });
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
 * 创建新工作区
 */
const createHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { createWorkspaceHandler } = await import('../core/workspace.js');
    const params: any = { name: parsed.name };
    if (parsed.avatar) params.avatar = parsed.avatar;
    
    const result = await createWorkspaceHandler(params);
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
 * 更新工作区设置
 */
const updateHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { updateWorkspaceHandler } = await import('../core/workspace.js');
    const params: any = { id: parsed.id };
    if (parsed.public !== undefined) params.public = parsed.public;
    if (parsed.ai !== undefined) params.enableAi = parsed.ai;
    
    const result = await updateWorkspaceHandler(params);
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
 * 删除工作区
 */
const deleteHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { deleteWorkspaceHandler } = await import('../core/workspace.js');
    const result = await deleteWorkspaceHandler({ id: parsed.id });
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
 * 工作区 CLI 操作映射
 */
export const runWorkspaceCommands: Record<string, CliAction> = {
  list: {
    name: 'list',
    description: '列出所有工作区',
    usage: 'list [--format text|json]',
    handler: listHandler,
    args: [
      { name: 'format', short: 'f', description: '输出格式 (text/json)', default: 'text', type: 'string' }
    ]
  },
  get: {
    name: 'get',
    description: '获取工作区详情',
    usage: 'get --id <workspace-id> [--format text|json]',
    handler: getHandler,
    args: [
      { name: 'id', short: 'i', description: '工作区 ID', required: true, type: 'string' },
      { name: 'format', short: 'f', description: '输出格式 (text/json)', default: 'text', type: 'string' }
    ]
  },
  create: {
    name: 'create',
    description: '创建新工作区',
    usage: 'create --name <name> [--avatar <emoji>] [--format text|json]',
    handler: createHandler,
    args: [
      { name: 'name', short: 'n', description: '工作区名称', required: true, type: 'string' },
      { name: 'avatar', short: 'a', description: '头像（emoji 或 URL）', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式 (text/json)', default: 'text', type: 'string' }
    ]
  },
  update: {
    name: 'update',
    description: '更新工作区设置',
    usage: 'update --id <workspace-id> [--public] [--ai] [--format text|json]',
    handler: updateHandler,
    args: [
      { name: 'id', short: 'i', description: '工作区 ID', required: true, type: 'string' },
      { name: 'public', description: '是否公开 (true/false)', type: 'boolean' },
      { name: 'ai', description: '启用 AI 功能 (true/false)', type: 'boolean' },
      { name: 'format', short: 'f', description: '输出格式 (text/json)', default: 'text', type: 'string' }
    ]
  },
  delete: {
    name: 'delete',
    description: '删除工作区',
    usage: 'delete --id <workspace-id> [--format text|json]',
    handler: deleteHandler,
    args: [
      { name: 'id', short: 'i', description: '工作区 ID', required: true, type: 'string' },
      { name: 'format', short: 'f', description: '输出格式 (text/json)', default: 'text', type: 'string' }
    ]
  }
};
