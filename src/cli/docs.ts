/**
 * Docs CLI 模块
 * 提供文档管理的命令行接口
 */

import {
  CliAction,
  CommandHandler,
  formatOutput,
  parseArgs,
  parseCoreResult
} from './utils.js';

/**
 * 列表文档
 */
const listHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
    const { listDocsHandler } = await import('../core/docs/crud.js');
    const params: any = {};
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.first) params.first = parsed.first;
    if (parsed.offset) params.offset = parsed.offset;
    
    const result = await listDocsHandler(params);
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
 * 获取文档详情
 */
const getHandler: CommandHandler = async (args) => {
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
    const { getDocHandler } = await import('../core/docs/crud.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await getDocHandler(params);
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
 * 读取文档内容
 */
const readHandler: CommandHandler = async (args) => {
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { readDocHandler } = await import('../core/docs/crud.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.markdown) params.includeMarkdown = true;
    
    const result = await readDocHandler(params);
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
 * 创建文档
 */
const createHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { createDocHandler } = await import('../core/docs/crud.js');
    const params: any = {};
    if (parsed.title) params.title = parsed.title;
    if (parsed.content) params.content = parsed.content;
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await createDocHandler(params);
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
 * 删除文档
 */
const deleteHandler: CommandHandler = async (args) => {
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
    const { deleteDocHandler } = await import('../core/docs/crud.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await deleteDocHandler(params);
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
 * 更新文档标题
 */
const updateTitleHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { updateDocTitleHandler } = await import('../core/docs/crud.js');
    const params: any = { docId: parsed['doc-id'], title: parsed.title };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await updateDocTitleHandler(params);
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
 * 复制文档
 */
const duplicateHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { duplicateDocHandler } = await import('../core/docs/crud.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed.title) params.title = parsed.title;
    if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await duplicateDocHandler(params);
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
 * 从模板创建文档
 */
const createFromTemplateHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { createDocFromTemplateHandler } = await import('../core/docs/crud.js');
    const params: any = { templateDocId: parsed['template-doc-id'], title: parsed.title };
    if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await createDocFromTemplateHandler(params);
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
 * 导出文档为 Markdown
 */
const exportMarkdownHandler: CommandHandler = async (args) => {
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { exportDocMarkdownHandler } = await import('../core/docs/markdown.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.frontmatter) params.includeFrontmatter = true;
    
    const result = await exportDocMarkdownHandler(params);
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
 * 从 Markdown 创建文档
 */
const createFromMarkdownHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { createDocFromMarkdownHandler } = await import('../core/docs/markdown.js');
    const params: any = { markdown: parsed.markdown };
    if (parsed.title) params.title = parsed.title;
    if (parsed['parent-doc-id']) params.parentDocId = parsed['parent-doc-id'];
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await createDocFromMarkdownHandler(params);
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
 * 追加段落
 */
const appendParagraphHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { appendParagraphHandler: handler } = await import('../core/docs/blocks.js');
    const params: any = { docId: parsed['doc-id'], text: parsed.text };
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
 * 搜索文档
 */
const searchHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { searchDocsHandler } = await import('../core/docs/search.js');
    const params: any = { query: parsed.query };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.limit) params.limit = parsed.limit;
    if (parsed['match-mode']) params.matchMode = parsed['match-mode'];
    if (parsed.tag) params.tag = parsed.tag;
    
    const result = await searchDocsHandler(params);
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
 * 按标题获取文档
 */
const getByTitleHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { getDocByTitleHandler } = await import('../core/docs/search.js');
    const params: any = { query: parsed.query };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.limit) params.limit = parsed.limit;
    
    const result = await getDocByTitleHandler(params);
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
 * 获取工作区树
 */
const treeHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { listWorkspaceTreeHandler } = await import('../core/docs/search.js');
    const params: any = {};
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.depth) params.depth = parsed.depth;
    
    const result = await listWorkspaceTreeHandler(params);
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
 * 获取孤立文档
 */
const orphanHandler: CommandHandler = async (args) => {
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
    const { getOrphanDocsHandler } = await import('../core/docs/search.js');
    const params: any = {};
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await getOrphanDocsHandler(params);
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
 * 获取子文档
 */
const childrenHandler: CommandHandler = async (args) => {
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
    const { listChildrenHandler } = await import('../core/docs/search.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await listChildrenHandler(params);
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
 * 获取反向链接
 */
const backlinksHandler: CommandHandler = async (args) => {
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
    const { listBacklinksHandler } = await import('../core/docs/search.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await listBacklinksHandler(params);
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
 * 移动文档
 */
const moveHandler: CommandHandler = async (args) => {
  const { parsed, errors } = parseArgs(args, [
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { moveDocHandler } = await import('../core/docs/blocks.js');
    const params: any = { docId: parsed['doc-id'], toParentDocId: parsed['to-parent-doc-id'] };
    if (parsed['from-parent-doc-id']) params.fromParentDocId = parsed['from-parent-doc-id'];
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await moveDocHandler(params);
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
 * 发布文档
 */
const publishHandler: CommandHandler = async (args) => {
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
  ]);

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') };
  }

  try {
    const { publishDocHandler } = await import('../core/docs/publish.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    if (parsed.mode) params.mode = parsed.mode;
    
    const result = await publishDocHandler(params);
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
 * 取消发布文档
 */
const revokeHandler: CommandHandler = async (args) => {
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
    const { revokeDocHandler } = await import('../core/docs/publish.js');
    const params: any = { docId: parsed['doc-id'] };
    if (parsed['workspace-id']) params.workspaceId = parsed['workspace-id'];
    
    const result = await revokeDocHandler(params);
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
 * Docs CLI 操作映射
 */
export const runDocsCommands: Record<string, CliAction> = {
  list: {
    name: 'list',
    description: '列出文档',
    usage: 'list [--workspace-id <id>] [--first <n>] [--offset <n>] [--format text|json]',
    handler: listHandler
  },
  get: {
    name: 'get',
    description: '获取文档元数据',
    usage: 'get --doc-id <id> [--workspace-id <id>] [--format text|json]',
    handler: getHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  read: {
    name: 'read',
    description: '读取文档内容',
    usage: 'read --doc-id <id> [--workspace-id <id>] [--markdown] [--format text|json]',
    handler: readHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'markdown', short: 'm', description: '包含 Markdown', type: 'boolean' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  create: {
    name: 'create',
    description: '创建文档',
    usage: 'create [--title <title>] [--content <markdown>] [--workspace-id <id>] [--format text|json]',
    handler: createHandler
  },
  delete: {
    name: 'delete',
    description: '删除文档',
    usage: 'delete --doc-id <id> [--workspace-id <id>] [--format text|json]',
    handler: deleteHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'update-title': {
    name: 'update-title',
    description: '更新文档标题',
    usage: 'update-title --doc-id <id> --title <title> [--workspace-id <id>] [--format text|json]',
    handler: updateTitleHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'title', short: 't', description: '新标题', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  duplicate: {
    name: 'duplicate',
    description: '复制文档',
    usage: 'duplicate --doc-id <id> [--title <title>] [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
    handler: duplicateHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '源文档 ID', required: true, type: 'string' },
      { name: 'title', short: 't', description: '新文档标题', type: 'string' },
      { name: 'parent-doc-id', description: '父文档 ID', type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'create-from-template': {
    name: 'create-from-template',
    description: '从模板创建文档',
    usage: 'create-from-template --template-doc-id <id> --title <title> [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
    handler: createFromTemplateHandler,
    args: [
      { name: 'template-doc-id', description: '模板文档 ID', required: true, type: 'string' },
      { name: 'title', short: 't', description: '新文档标题', required: true, type: 'string' },
      { name: 'parent-doc-id', description: '父文档 ID', type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'export-markdown': {
    name: 'export-markdown',
    description: '导出文档为 Markdown',
    usage: 'export-markdown --doc-id <id> [--workspace-id <id>] [--frontmatter] [--format text|json]',
    handler: exportMarkdownHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'frontmatter', description: '包含 frontmatter', type: 'boolean' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'create-from-markdown': {
    name: 'create-from-markdown',
    description: '从 Markdown 创建文档',
    usage: 'create-from-markdown --markdown <content> [--title <title>] [--parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
    handler: createFromMarkdownHandler,
    args: [
      { name: 'markdown', short: 'm', description: 'Markdown 内容', required: true, type: 'string' },
      { name: 'title', short: 't', description: '文档标题', type: 'string' },
      { name: 'parent-doc-id', description: '父文档 ID', type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'append-paragraph': {
    name: 'append-paragraph',
    description: '追加段落',
    usage: 'append-paragraph --doc-id <id> --text <text> [--workspace-id <id>] [--format text|json]',
    handler: appendParagraphHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'text', short: 't', description: '段落文本', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  search: {
    name: 'search',
    description: '搜索文档',
    usage: 'search --query <keyword> [--workspace-id <id>] [--limit <n>] [--match-mode <mode>] [--tag <tag>] [--format text|json]',
    handler: searchHandler,
    args: [
      { name: 'query', short: 'q', description: '搜索关键词', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'limit', short: 'l', description: '返回数量', type: 'number' },
      { name: 'match-mode', description: '匹配模式', default: 'substring', type: 'string' },
      { name: 'tag', description: '按标签过滤', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  'get-by-title': {
    name: 'get-by-title',
    description: '按标题获取文档',
    usage: 'get-by-title --query <title> [--workspace-id <id>] [--limit <n>] [--format text|json]',
    handler: getByTitleHandler,
    args: [
      { name: 'query', short: 'q', description: '文档标题', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'limit', short: 'l', description: '返回数量', type: 'number' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  tree: {
    name: 'tree',
    description: '获取工作区树',
    usage: 'tree [--workspace-id <id>] [--depth <n>] [--format text|json]',
    handler: treeHandler
  },
  orphan: {
    name: 'orphan',
    description: '获取孤立文档',
    usage: 'orphan [--workspace-id <id>] [--format text|json]',
    handler: orphanHandler
  },
  children: {
    name: 'children',
    description: '获取子文档',
    usage: 'children --doc-id <id> [--workspace-id <id>] [--format text|json]',
    handler: childrenHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  backlinks: {
    name: 'backlinks',
    description: '获取反向链接',
    usage: 'backlinks --doc-id <id> [--workspace-id <id>] [--format text|json]',
    handler: backlinksHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  move: {
    name: 'move',
    description: '移动文档',
    usage: 'move --doc-id <id> --to-parent-doc-id <id> [--from-parent-doc-id <id>] [--workspace-id <id>] [--format text|json]',
    handler: moveHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'to-parent-doc-id', description: '目标父文档 ID', required: true, type: 'string' },
      { name: 'from-parent-doc-id', description: '源父文档 ID', type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  publish: {
    name: 'publish',
    description: '发布文档',
    usage: 'publish --doc-id <id> [--workspace-id <id>] [--mode Page|Edgeless] [--format text|json]',
    handler: publishHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'mode', description: '模式', default: 'Page', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  },
  revoke: {
    name: 'revoke',
    description: '取消发布文档',
    usage: 'revoke --doc-id <id> [--workspace-id <id>] [--format text|json]',
    handler: revokeHandler,
    args: [
      { name: 'doc-id', short: 'd', description: '文档 ID', required: true, type: 'string' },
      { name: 'workspace-id', short: 'w', description: '工作区 ID', type: 'string' },
      { name: 'format', short: 'f', description: '输出格式', default: 'text', type: 'string' }
    ]
  }
};
