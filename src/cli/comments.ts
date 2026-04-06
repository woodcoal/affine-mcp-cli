/**
 * Comment CLI 模块
 * 提供评论管理的命令行接口
 */

import {
  CliAction,
  CommandHandler,
  formatOutput,
  parseArgs,
  parseCoreResult
} from './utils.js';

/**
 * 列出评论
 */
const listHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { listCommentsHandler } = await import('../core/comments.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.first) params.first = parsed.first;
    if (parsed.offset) params.offset = parsed.offset;
    
    const result = await listCommentsHandler(params);
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
 * 创建评论
 */
const createHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { createCommentHandler } = await import('../core/comments.js');
    const params: any = { docId: parsed['doc-id'], content: parsed.content };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed['doc-title']) params.docTitle = parsed['doc-title'];
    if (parsed['doc-mode']) params.docMode = parsed['doc-mode'];
    
    const result = await createCommentHandler(params);
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
 * 更新评论
 */
const updateHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { updateCommentHandler } = await import('../core/comments.js');
    const params: any = { id: parsed.id, content: parsed.content };
    
    const result = await updateCommentHandler(params);
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
 * 删除评论
 */
const deleteHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { deleteCommentHandler } = await import('../core/comments.js');
    const result = await deleteCommentHandler({ id: parsed.id });
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
 * 解决评论
 */
const resolveHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { resolveCommentHandler } = await import('../core/comments.js');
    const params: any = { id: parsed.id, resolved: parsed.resolved };
    
    const result = await resolveCommentHandler(params);
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
 * Comment CLI 操作映射
 */
export const runCommentCommands: Record<string, CliAction> = {
  list: {
    name: 'list',
    description: '列出文档评论',
    usage: 'list --doc-id <id> [--workspace-id <id>] [--first <n>] [--offset <n>] [--format text|json]',
    handler: listHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'first', description: '返回数量', type: 'number' },
      { name: 'offset', description: '偏移量', type: 'number' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  create: {
    name: 'create',
    description: '创建评论',
    usage: 'create --doc-id <id> --content <text> [--workspace-id <id>] [--doc-title <title>] [--format text|json]',
    handler: createHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'content', short: 'c', description: '评论内容', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'doc-title', description: '文档标题', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  update: {
    name: 'update',
    description: '更新评论',
    usage: 'update --id <id> --content <text> [--format text|json]',
    handler: updateHandler,
    args: [
      { name: 'id', short: 'i', description: '评论 ID', required: true, type: 'string' },
      { name: 'content', short: 'c', description: '新评论内容', required: true, type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  delete: {
    name: 'delete',
    description: '删除评论',
    usage: 'delete --id <id> [--format text|json]',
    handler: deleteHandler,
    args: [
      { name: 'id', short: 'i', description: '评论 ID', required: true, type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  resolve: {
    name: 'resolve',
    description: '解决/取消解决评论',
    usage: 'resolve --id <id> --resolved <true|false> [--format text|json]',
    handler: resolveHandler,
    args: [
      { name: 'id', short: 'i', description: '评论 ID', required: true, type: 'string' },
      { name: 'resolved', short: 'r', description: '是否已解决', required: true, type: 'boolean' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  }
};
