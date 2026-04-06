/**
 * CLI 主入口模块
 * 提供 AFFiNE 命令行工具，支持模块化命令和内置命令
 */

import { CliModule, generateHelp, outputResult } from './utils.js';
import { VERSION, loadConfig } from '../config.js';
import * as fs from 'fs';
import {
  GLOBAL_CONFIG_FILE,
  LOCAL_CONFIG_FILE,
  loadConfigFile,
  readKeyValueFile,
  validateBaseUrl,
  writeConfigFile
} from '../config.js';
import { loginWithPassword } from '../auth.js';
import { fetch } from 'undici';

// ---------------------------------------------------------------------------
// 导入模块化命令
// ---------------------------------------------------------------------------
import { runWorkspaceCommands } from './workspace.js';
import { runDocsCommands } from './docs.js';
import { runCommentCommands } from './comments.js';
import { runHistoryCommands } from './history.js';
import { runOrganizeCommands } from './organize.js';
import { runUserCommands } from './user.js';
import { runTokenCommands } from './tokens.js';
import { runBlobCommands } from './blobs.js';
import { runNotificationCommands } from './notifications.js';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------
type ConnectionInspection = {
  userName: string;
  userEmail: string;
  workspaceCount: number;
};

class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

// ---------------------------------------------------------------------------
// 辅助函数
// ---------------------------------------------------------------------------
const CLI_FETCH_TIMEOUT_MS = 30_000;

async function gql(
  baseUrl: string,
  auth: { token?: string; cookie?: string },
  query: string,
  variables?: Record<string, any>
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': `affine-cli/${VERSION}`
  };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth.cookie) headers.Cookie = auth.cookie;
  const body: any = { query };
  if (variables) body.variables = variables;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLI_FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${baseUrl}/graphql`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${CLI_FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  if (json.errors) throw new Error(json.errors.map((e: any) => e.message).join('; '));
  return json.data;
}

async function resolveCliAuth(baseUrl: string): Promise<{ auth: { token?: string; cookie?: string }; authKind: string }> {
  const effective = loadConfig();
  if (effective.apiToken) {
    return { auth: { token: effective.apiToken }, authKind: 'api-token' };
  }
  if (effective.cookie) {
    return { auth: { cookie: effective.cookie }, authKind: 'cookie' };
  }
  if (effective.email && effective.password) {
    const { cookieHeader } = await loginWithPassword(baseUrl, effective.email, effective.password);
    return { auth: { cookie: cookieHeader }, authKind: 'email-password' };
  }
  throw new CliError("No authentication configured. Run 'affine-cli login' or set AFFINE_API_TOKEN.");
}

async function inspectConnection(baseUrl: string, auth: { token?: string; cookie?: string }): Promise<ConnectionInspection> {
  const data = await gql(baseUrl, auth, 'query { currentUser { name email } workspaces { id } }');
  return {
    userName: data.currentUser.name,
    userEmail: data.currentUser.email,
    workspaceCount: data.workspaces.length
  };
}

function redactSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function getConfigValueSource(
  name: string,
  globalFile: Record<string, string>,
  localFile: Record<string, string>,
  fallback?: string
): 'env' | 'local' | 'global' | 'default' | 'unset' {
  if (process.env[name]) return 'env';
  if (localFile[name]) return 'local';
  if (globalFile[name]) return 'global';
  if (fallback !== undefined) return 'default';
  return 'unset';
}

function buildEffectiveConfigSummary() {
  const globalConfig = readKeyValueFile(GLOBAL_CONFIG_FILE);
  const localConfig = readKeyValueFile(LOCAL_CONFIG_FILE);
  const effective = loadConfig();
  const authKind = effective.apiToken
    ? 'api-token'
    : effective.cookie
      ? 'cookie'
      : effective.email && effective.password
        ? 'email-password'
        : 'none';

  return {
    configFile: GLOBAL_CONFIG_FILE,
    localConfigFile: LOCAL_CONFIG_FILE,
    configFileExists: fs.existsSync(GLOBAL_CONFIG_FILE),
    localConfigFileExists: fs.existsSync(LOCAL_CONFIG_FILE),
    baseUrl: effective.baseUrl,
    graphqlPath: effective.graphqlPath,
    workspaceId: effective.defaultWorkspaceId || null,
    authMode: effective.authMode,
    authKind,
    apiToken: effective.apiToken ? redactSecret(effective.apiToken) : null,
    cookie: effective.cookie ? '(set)' : null,
    email: effective.email || null,
    publicBaseUrl: effective.publicBaseUrl || null,
    oauthIssuerUrl: effective.oauthIssuerUrl || null,
    oauthScopes: effective.oauthScopes,
    sources: {
      baseUrl: getConfigValueSource('AFFINE_BASE_URL', globalConfig, localConfig, 'http://localhost:3010'),
      apiToken: getConfigValueSource('AFFINE_API_TOKEN', globalConfig, localConfig),
      cookie: getConfigValueSource('AFFINE_COOKIE', globalConfig, localConfig),
      email: getConfigValueSource('AFFINE_EMAIL', globalConfig, localConfig),
      password: getConfigValueSource('AFFINE_PASSWORD', globalConfig, localConfig),
      workspaceId: getConfigValueSource('AFFINE_WORKSPACE_ID', globalConfig, localConfig),
      authMode: getConfigValueSource('AFFINE_MCP_AUTH_MODE', globalConfig, localConfig, 'bearer'),
      publicBaseUrl: getConfigValueSource('AFFINE_MCP_PUBLIC_BASE_URL', globalConfig, localConfig),
      oauthIssuerUrl: getConfigValueSource('AFFINE_OAUTH_ISSUER_URL', globalConfig, localConfig),
      oauthScopes: getConfigValueSource('AFFINE_OAUTH_SCOPES', globalConfig, localConfig, 'mcp')
    }
  };
}

// ---------------------------------------------------------------------------
// 内置命令处理器
// ---------------------------------------------------------------------------

async function login(args: string[]): Promise<void> {
  const consumeOption = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index === -1) return undefined;
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new CliError(`Missing value for '${flag}'.`);
    }
    args.splice(index, 2);
    return value;
  };

  const consumeFlags = (...flags: string[]): boolean => {
    let found = false;
    for (const flag of flags) {
      let index = args.indexOf(flag);
      while (index !== -1) {
        args.splice(index, 1);
        found = true;
        index = args.indexOf(flag);
      }
    }
    return found;
  };

  const providedUrl = consumeOption('--url');
  const providedToken = consumeOption('--token');
  const providedWorkspaceId = consumeOption('--workspace-id');
  const force = consumeFlags('--force', '-f');

  if (args.length > 0) {
    throw new CliError(`Unexpected arguments: ${args.join(' ')}`);
  }

  console.error('Affine CLI — Login\n');

  const existing = loadConfigFile();
  if (existing.AFFINE_API_TOKEN) {
    console.error(`Existing global config: ${GLOBAL_CONFIG_FILE}`);
    console.error(`  URL:       ${existing.AFFINE_BASE_URL || '(default)'}`);
    console.error('  Token:     (set)');
    console.error(`  Workspace: ${existing.AFFINE_WORKSPACE_ID || '(none)'}\n`);
    if (!force) {
      const readline = await import('readline');
      const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
      const ask = (prompt: string): Promise<string> => new Promise(resolve => rl.question(prompt, resolve));
      const overwrite = await ask('Overwrite? [y/N] ');
      rl.close();
      if (!/^[yY]$/.test(overwrite)) {
        console.error('Keeping existing config.');
        return;
      }
      console.error('');
    } else {
      console.error('Overwriting existing config (--force).\n');
    }
  }

  const defaultUrl = 'https://app.affine.pro';
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const askInput = (prompt: string): Promise<string> => new Promise(resolve => rl.question(prompt, resolve));
  
  const rawUrl = providedUrl ?? ((await askInput(`Affine URL [${defaultUrl}]: `)) || defaultUrl);
  const baseUrl = validateBaseUrl(rawUrl);
  rl.close();

  let result: { token: string; workspaceId: string };

  if (providedToken) {
    console.error('Testing provided token...');
    try {
      await inspectConnection(baseUrl, { token: providedToken });
      console.error('✓ Token valid\n');
    } catch (err: any) {
      throw new CliError(`Authentication failed: ${err.message}`);
    }
    result = { token: providedToken, workspaceId: '' };
  } else {
    const rl2 = await import('readline');
    const rl2Interface = rl2.createInterface({ input: process.stdin, output: process.stderr });
    const ask2 = (prompt: string): Promise<string> => new Promise(resolve => rl2Interface.question(prompt, resolve));
    
    console.error('\nEnter your API token:');
    console.error(`  1. Open ${baseUrl}/settings in your browser`);
    console.error('  2. Account Settings → Integrations → MCP Server');
    console.error('  3. Copy the Personal access token\n');
    
    const token = await ask2('API token: ');
    rl2Interface.close();
    
    if (!token) {
      throw new CliError('No token provided.');
    }

    console.error('Testing connection...');
    try {
      await inspectConnection(baseUrl, { token });
      console.error('✓ Authenticated\n');
    } catch (err: any) {
      throw new CliError(`Authentication failed: ${err.message}`);
    }
    result = { token, workspaceId: '' };
  }

  writeConfigFile({
    AFFINE_BASE_URL: baseUrl,
    AFFINE_API_TOKEN: result.token,
    AFFINE_WORKSPACE_ID: providedWorkspaceId || result.workspaceId
  });

  console.error(`\n✓ Saved to ${GLOBAL_CONFIG_FILE} (mode 600)`);
}

async function status(args: string[]): Promise<void> {
  const asJson = args.includes('--json');
  const otherArgs = args.filter(a => !a.startsWith('--'));
  
  if (otherArgs.length > 0 || (args.includes('--json') && args.indexOf('--json') !== args.length - 1 && args.filter(a => a === '--json').length > 1)) {
    throw new CliError('Usage: affine-cli status [--json]');
  }

  const config = loadConfigFile();
  if (!config.AFFINE_API_TOKEN) {
    throw new CliError('Not logged in. Run: affine-cli login');
  }
  try {
    const inspection = await inspectConnection(
      config.AFFINE_BASE_URL || 'https://app.affine.pro',
      { token: config.AFFINE_API_TOKEN }
    );
    if (asJson) {
      console.log(JSON.stringify({
        configFile: GLOBAL_CONFIG_FILE,
        baseUrl: config.AFFINE_BASE_URL || 'https://app.affine.pro',
        workspaceId: config.AFFINE_WORKSPACE_ID || null,
        userName: inspection.userName,
        userEmail: inspection.userEmail,
        workspaceCount: inspection.workspaceCount
      }, null, 2));
      return;
    }

    console.error(`Global config: ${GLOBAL_CONFIG_FILE}`);
    console.error(`URL:       ${config.AFFINE_BASE_URL || '(default)'}`);
    console.error('Token:     (set)');
    console.error(`Workspace: ${config.AFFINE_WORKSPACE_ID || '(none)'}\n`);
    console.error(`User: ${inspection.userName} <${inspection.userEmail}>`);
    console.error(`Workspaces: ${inspection.workspaceCount}`);
  } catch (err: any) {
    throw new CliError(`Connection failed: ${err.message}`);
  }
}

function logout(): void {
  if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    fs.unlinkSync(GLOBAL_CONFIG_FILE);
    console.error(`Removed ${GLOBAL_CONFIG_FILE}`);
  } else {
    console.error('No config file found.');
  }
}

function configPath(): void {
  console.log(GLOBAL_CONFIG_FILE);
}

function showConfig(args: string[]): void {
  const asJson = args.includes('--json');
  
  const summary = buildEffectiveConfigSummary();
  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`Global config: ${summary.configFile} (${summary.configFileExists ? 'found' : 'missing'})`);
  console.log(`Local config: ${summary.localConfigFile} (${summary.localConfigFileExists ? 'found' : 'missing'})`);
  console.log(`Base URL: ${summary.baseUrl} (${summary.sources.baseUrl})`);
  console.log(`GraphQL path: ${summary.graphqlPath}`);
  console.log(`Auth mode: ${summary.authMode} (${summary.sources.authMode})`);
  console.log(`Auth kind: ${summary.authKind}`);
  console.log(`Workspace: ${summary.workspaceId || '(none)'} (${summary.sources.workspaceId})`);
  if (summary.apiToken) console.log(`API token: ${summary.apiToken} (${summary.sources.apiToken})`);
  if (summary.cookie) console.log(`Cookie: ${summary.cookie} (${summary.sources.cookie})`);
  if (summary.email) console.log(`Email: ${summary.email} (${summary.sources.email})`);
  if (summary.publicBaseUrl) console.log(`Public base URL: ${summary.publicBaseUrl} (${summary.sources.publicBaseUrl})`);
  if (summary.oauthIssuerUrl) console.log(`OAuth issuer URL: ${summary.oauthIssuerUrl} (${summary.sources.oauthIssuerUrl})`);
  if (summary.authMode === 'oauth') console.log(`OAuth scopes: ${summary.oauthScopes.join(', ')} (${summary.sources.oauthScopes})`);
}

async function doctor(args: string[]): Promise<void> {
  const asJson = args.includes('--json');
  
  const summary = buildEffectiveConfigSummary();
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  checks.push({
    name: 'config-file',
    ok: summary.configFileExists,
    detail: summary.configFileExists ? summary.configFile : 'No saved config file found'
  });

  let authKind = 'none';
  try {
    const { auth, authKind: resolvedAuthKind } = await resolveCliAuth(summary.baseUrl);
    authKind = resolvedAuthKind;
    checks.push({
      name: 'auth-configured',
      ok: true,
      detail: `Using ${resolvedAuthKind}`
    });

    const healthController = new AbortController();
    const healthTimer = setTimeout(() => healthController.abort(), CLI_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(summary.baseUrl, { signal: healthController.signal });
      checks.push({
        name: 'base-url',
        ok: response.ok,
        detail: `HTTP ${response.status}`
      });
    } catch (err: any) {
      checks.push({
        name: 'base-url',
        ok: false,
        detail: err?.message || 'Could not reach base URL'
      });
    } finally {
      clearTimeout(healthTimer);
    }

    try {
      const data = await inspectConnection(summary.baseUrl, auth);
      checks.push({
        name: 'graphql-auth',
        ok: true,
        detail: `${data.userEmail} (${data.workspaceCount} workspace(s))`
      });
    } catch (err: any) {
      checks.push({
        name: 'graphql-auth',
        ok: false,
        detail: err?.message || 'GraphQL auth failed'
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'auth-configured',
      ok: false,
      detail: err?.message || 'No authentication configured'
    });
  }

  if (summary.authMode === 'oauth') {
    const oauthReady = Boolean(summary.publicBaseUrl && summary.oauthIssuerUrl && summary.oauthScopes.length > 0);
    checks.push({
      name: 'oauth-config',
      ok: oauthReady,
      detail: oauthReady
        ? `${summary.publicBaseUrl} -> ${summary.oauthIssuerUrl}`
        : 'OAuth mode requires AFFINE_MCP_PUBLIC_BASE_URL and AFFINE_OAUTH_ISSUER_URL'
    });
  }

  const ok = checks.every((check) => check.ok);

  if (asJson) {
    console.log(JSON.stringify({ ok, config: summary, checks, authKind }, null, 2));
    if (!ok) process.exit(1);
    return;
  }

  console.log(`Doctor: ${ok ? 'OK' : 'FAILED'}`);
  console.log(`Base URL: ${summary.baseUrl}`);
  console.log(`Auth mode: ${summary.authMode}`);
  for (const check of checks) {
    console.log(`${check.ok ? '✓' : '✗'} ${check.name}: ${check.detail}`);
  }
  if (!ok) {
    throw new CliError('Doctor checks failed.');
  }
}

function snippet(args: string[]): void {
  const includeEnv = args.includes('--env');
  const target = args.filter(a => !a.startsWith('--'))[0];

  if (!target) {
    throw new CliError('Usage: affine-cli snippet <claude|cursor|codex|all> [--env]');
  }

  const effective = loadConfig();
  const getEnv = (): Record<string, string> => {
    const env: Record<string, string> = {};
    if (effective.baseUrl) env.AFFINE_BASE_URL = effective.baseUrl;
    if (effective.apiToken) env.AFFINE_API_TOKEN = effective.apiToken;
    if (effective.defaultWorkspaceId) env.AFFINE_WORKSPACE_ID = effective.defaultWorkspaceId;
    if (effective.authMode === 'oauth') {
      env.AFFINE_MCP_AUTH_MODE = 'oauth';
      if (effective.publicBaseUrl) env.AFFINE_MCP_PUBLIC_BASE_URL = effective.publicBaseUrl;
      if (effective.oauthIssuerUrl) env.AFFINE_OAUTH_ISSUER_URL = effective.oauthIssuerUrl;
      if (effective.oauthScopes.length > 0) env.AFFINE_OAUTH_SCOPES = effective.oauthScopes.join(' ');
    }
    return env;
  };

  const env = includeEnv ? getEnv() : undefined;

  if (target === 'all') {
    const payload = {
      claude: { mcpServers: { affine: { command: 'affine-mcp', ...(env && Object.keys(env).length > 0 ? { env } : {}) } } },
      cursor: { mcpServers: { affine: { command: 'affine-mcp', ...(env && Object.keys(env).length > 0 ? { env } : {}) } } },
      codex: env && Object.keys(env).length > 0
        ? `codex mcp add affine ${Object.entries(env).map(([key, value]) => `--env ${key}=${JSON.stringify(value)}`).join(' ')} -- affine-mcp`
        : 'codex mcp add affine -- affine-mcp'
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (target === 'claude' || target === 'cursor') {
    console.log(JSON.stringify({
      mcpServers: { affine: { command: 'affine-mcp', ...(env && Object.keys(env).length > 0 ? { env } : {}) } }
    }, null, 2));
    return;
  }

  if (target === 'codex') {
    if (!env || Object.keys(env).length === 0) {
      console.log('codex mcp add affine -- affine-mcp');
      return;
    }
    const envArgs = Object.entries(env).map(([key, value]) => `--env ${key}=${JSON.stringify(value)}`).join(' ');
    console.log(`codex mcp add affine ${envArgs} -- affine-mcp`);
    return;
  }

  throw new CliError(`Unknown snippet target '${target}'. Expected claude, cursor, codex, or all.`);
}

// ---------------------------------------------------------------------------
// 补全命令
// ---------------------------------------------------------------------------
async function completion(args: string[]): Promise<void> {
  const shell = args[0] || '';

  // 获取所有模块和动作
  const modules = Object.keys(CLI_MODULES);

  let script = '';

  switch (shell) {
    case 'bash':
      script = `#!/bin/bash
# AFFiNE CLI Bash 补全脚本
# 安装方法: affine-cli completion bash >> ~/.bashrc

_affine_cli() {
    local cur prev words cword
    _init_completion -n '=' || return

    # 预定义选项
    local options='--help --version -h -v'

    # 模块列表
    local modules='${modules.join(' ')}'

    # 内置命令
    local builtins='login status logout doctor show-config config-path snippet completion help'

    # 检查是否已经有模块名
    for word in "\${words[@]}"; do
        case $word in
            workspace)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runWorkspaceCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            docs)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runDocsCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            comment)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runCommentCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            history)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runHistoryCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            organize)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runOrganizeCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            user)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runUserCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            token)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runTokenCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            blob)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runBlobCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
            notification)
                COMPREPLY=($(compgen -W "$(echo '${Object.keys(runNotificationCommands).join(' ')}') $options" -- "$cur"))
                return
                ;;
        esac
    done

    # 第一个位置：模块或命令
    COMPREPLY=($(compgen -W "$modules $builtins $options" -- "$cur"))
}

complete -F _affine_cli affine-cli
`;
      break;

    case 'zsh':
      script = `#!/usr/bin/env zsh
# AFFiNE CLI Zsh 补全脚本
# 安装方法: affine-cli completion zsh >> ~/.zshrc

_affine_cli() {
    local -a commands modules options

    commands=(
        'login:交互式登录'
        'status:显示状态'
        'logout:退出登录'
        'doctor:诊断问题'
        'show-config:显示配置'
        'config-path:配置路径'
        'snippet:生成代码片段'
        'completion:生成补全脚本'
        'help:帮助'
    )

    modules=(
        'workspace:管理工作区'
        'docs:管理文档'
        'comment:管理评论'
        'history:查看历史'
        'organize:组织管理'
        'user:用户管理'
        'token:令牌管理'
        'blob:存储管理'
        'notification:通知管理'
    )

    options=('--help' '--version' '-h' '-v')

    local -a workspace_actions docs_actions comment_actions history_actions
    workspace_actions=(${Object.keys(runWorkspaceCommands).map(a => `'${a}:${runWorkspaceCommands[a]?.description || ''}'`).join(' ')})
    docs_actions=(${Object.keys(runDocsCommands).map(a => `'${a}:${runDocsCommands[a]?.description || ''}'`).join(' ')})
    comment_actions=(${Object.keys(runCommentCommands).map(a => `'${a}:${runCommentCommands[a]?.description || ''}'`).join(' ')})
    history_actions=(${Object.keys(runHistoryCommands).map(a => `'${a}:${runHistoryCommands[a]?.description || ''}'`).join(' ')})

    _arguments -C \\
        '1: :->first' \\
        '2: :->second' \\
        '*: :->rest'

    case $state in
        first)
            _describe 'command/module' commands
            _describe 'module' modules
            ;;
        second)
            case $words[2] in
                workspace)
                    _describe 'action' workspace_actions
                    ;;
                docs)
                    _describe 'action' docs_actions
                    ;;
                comment)
                    _describe 'action' comment_actions
                    ;;
                history)
                    _describe 'action' history_actions
                    ;;
                *)
                    _describe 'option' options
                    ;;
            esac
            ;;
        rest)
            _describe 'option' options
            ;;
    esac
}

compdef _affine_cli affine-cli
`;
      break;

    case 'fish':
      script = `# AFFiNE CLI Fish 补全脚本
# 安装方法: affine-cli completion fish > ~/.config/fish/completions/affine-cli.fish

complete -c affine-cli -f

# 模块
complete -c affine-cli -a 'workspace' -d '管理工作区'
complete -c affine-cli -a 'docs' -d '管理文档'
complete -c affine-cli -a 'comment' -d '管理评论'
complete -c affine-cli -a 'history' -d '查看历史'
complete -c affine-cli -a 'organize' -d '组织管理'
complete -c affine-cli -a 'user' -d '用户管理'
complete -c affine-cli -a 'token' -d '令牌管理'
complete -c affine-cli -a 'blob' -d '存储管理'
complete -c affine-cli -a 'notification' -d '通知管理'

# 内置命令
complete -c affine-cli -a 'login' -d '交互式登录'
complete -c affine-cli -a 'status' -d '显示状态'
complete -c affine-cli -a 'logout' -d '退出登录'
complete -c affine-cli -a 'doctor' -d '诊断问题'
complete -c affine-cli -a 'show-config' -d '显示配置'
complete -c affine-cli -a 'config-path' -d '配置路径'
complete -c affine-cli -a 'snippet' -d '生成代码片段'
complete -c affine-cli -a 'completion' -d '生成补全脚本'
complete -c affine-cli -a 'help' -d '帮助'

# 选项
complete -c affine-cli -s h -l help -d '显示帮助'
complete -c affine-cli -s v -l version -d '显示版本'

# workspace 子命令
complete -c affine-cli -n '__fish_seen_subcommand_from workspace' -a 'list' -d '列出工作区'
complete -c affine-cli -n '__fish_seen_subcommand_from workspace' -a 'get' -d '获取工作区'
complete -c affine-cli -n '__fish_seen_subcommand_from workspace' -a 'create' -d '创建工作区'
complete -c affine-cli -n '__fish_seen_subcommand_from workspace' -a 'update' -d '更新工作区'
complete -c affine-cli -n '__fish_seen_subcommand_from workspace' -a 'delete' -d '删除工作区'

# docs 子命令
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'list' -d '列出文档'
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'get' -d '获取文档'
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'create' -d '创建文档'
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'update' -d '更新文档'
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'delete' -d '删除文档'
complete -c affine-cli -n '__fish_seen_subcommand_from docs' -a 'search' -d '搜索文档'

# 其他模块的通用选项
complete -c affine-cli -n '__fish_seen_subcommand_from workspace docs comment history organize user token blob notification' -s w -l workspace-id -d '工作区ID'
complete -c affine-cli -n '__fish_seen_subcommand_from workspace docs comment history organize user token blob notification' -s f -l format -a 'text json' -d '输出格式'
`;
      break;

    case 'powershell':
    case 'pwsh':
      script = `# AFFiNE CLI PowerShell 补全脚本
# 安装方法: affine-cli completion powershell >> $PROFILE

$scriptblock = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $modules = @('workspace', 'docs', 'comment', 'history', 'organize', 'user', 'token', 'blob', 'notification')
    $builtins = @('login', 'status', 'logout', 'doctor', 'show-config', 'config-path', 'snippet', 'completion', 'help')
    $options = @('--help', '--version', '-h', '-v')

    $completions = @()

    # 检查当前是否有模块名
    $words = $commandAst.CommandElements | Select-Object -ExpandProperty Value
    if ($words.Count -gt 1) {
        $module = $words[1]
        switch ($module) {
            'workspace' {
                $completions = @('list', 'get', 'create', 'update', 'delete')
            }
            'docs' {
                $completions = @('list', 'get', 'create', 'update', 'delete', 'search', 'create-from-markdown', 'export-markdown', 'batch-create', 'move', 'duplicate', 'publish', 'revoke', 'list-by-tag', 'get-by-title', 'find-and-replace')
            }
            'comment' {
                $completions = @('list', 'create', 'update', 'resolve', 'delete')
            }
            'history' {
                $completions = @('list')
            }
            'organize' {
                $completions = @('list-collections', 'get-collection', 'create-collection', 'update-collection', 'delete-collection', 'add-doc', 'remove-doc', 'list-nodes', 'create-folder', 'rename-folder', 'delete-folder', 'move-node', 'add-link', 'delete-link')
            }
            'user' {
                $completions = @('current', 'update-profile', 'update-settings')
            }
            'token' {
                $completions = @('list', 'create', 'revoke')
            }
            'blob' {
                $completions = @('upload', 'delete', 'cleanup')
            }
            'notification' {
                $completions = @('list', 'read-all')
            }
            default {
                $completions = $options
            }
        }
    } else {
        $completions = $modules + $builtins + $options
    }

    foreach ($item in $completions) {
        [System.Management.Automation.CompletionResult]::new($item, $item, 'ParameterValue', $item)
    }
}

Register-ArgumentCompleter -CommandName affine-cli -ScriptBlock $scriptblock
`;
      break;

    default:
      console.error(`支持的 shell: bash, zsh, fish, powershell`);
      console.error('');
      console.error('用法: affine-cli completion <shell>');
      console.error('示例:');
      console.error('  affine-cli completion bash >> ~/.bashrc');
      console.error('  affine-cli completion zsh >> ~/.zshrc');
      console.error('  affine-cli completion fish > ~/.config/fish/completions/affine-cli.fish');
      console.error('  affine-cli completion powershell >> $PROFILE');
      return;
  }

  console.log(script);
}

// ---------------------------------------------------------------------------
// CLI 模块注册
// ---------------------------------------------------------------------------
const CLI_MODULES: Record<string, CliModule> = {
  workspace: {
    name: 'workspace',
    description: '管理工作区（创建、列表、获取、更新、删除）',
    actions: runWorkspaceCommands
  },
  docs: {
    name: 'docs',
    description: '管理文档（创建、读取、更新、删除、搜索等）',
    actions: runDocsCommands
  },
  comment: {
    name: 'comment',
    description: '管理文档评论',
    actions: runCommentCommands
  },
  history: {
    name: 'history',
    description: '查看文档历史记录',
    actions: runHistoryCommands
  },
  organize: {
    name: 'organize',
    description: '管理收藏集和文件夹',
    actions: runOrganizeCommands
  },
  user: {
    name: 'user',
    description: '用户信息管理',
    actions: runUserCommands
  },
  token: {
    name: 'token',
    description: '访问令牌管理',
    actions: runTokenCommands
  },
  blob: {
    name: 'blob',
    description: 'Blob 存储管理',
    actions: runBlobCommands
  },
  notification: {
    name: 'notification',
    description: '通知管理',
    actions: runNotificationCommands
  }
};

// ---------------------------------------------------------------------------
// 内置命令注册
// ---------------------------------------------------------------------------
type BuiltinCommandHandler = (args: string[]) => Promise<void> | void;

const BUILTIN_COMMANDS: Record<string, { summary: string; handler: BuiltinCommandHandler }> = {
  login: {
    summary: '交互式登录并配置',
    handler: login
  },
  status: {
    summary: '测试配置并显示当前用户',
    handler: status
  },
  logout: {
    summary: '清除已保存的配置',
    handler: logout
  },
  'show-config': {
    summary: '显示当前配置（已脱敏）',
    handler: (args) => showConfig(args)
  },
  'config-path': {
    summary: '打印配置文件路径',
    handler: configPath
  },
  doctor: {
    summary: '运行本地配置和连接诊断',
    handler: doctor
  },
  snippet: {
    summary: '生成 Claude/Cursor/Codex 配置片段',
    handler: snippet
  },
  completion: {
    summary: '生成 shell 补全脚本',
    handler: completion
  }
};

// ---------------------------------------------------------------------------
// 主帮助信息
// ---------------------------------------------------------------------------
function printMainHelp() {
  const lines = [
    `affine-cli ${VERSION} - AFFiNE 命令行工具`,
    '',
    '用法:',
    '  affine-cli <command> [options]     运行内置命令',
    '  affine-cli <module> <action> [options]  运行模块命令',
    '  affine-cli <module> --help         显示模块帮助',
    '  affine-cli help [command|module]    显示帮助',
    '',
    '内置命令:'
  ];

  for (const [name, cmd] of Object.entries(BUILTIN_COMMANDS)) {
    lines.push(`  ${name.padEnd(14)} ${cmd.summary}`);
  }

  lines.push('');
  lines.push('模块 (用于数据操作):');

  for (const [name, module] of Object.entries(CLI_MODULES)) {
    lines.push(`  ${name.padEnd(14)} ${module.description}`);
  }

  lines.push('');
  lines.push('示例:');
  lines.push('  affine-cli login');
  lines.push('  affine-cli status');
  lines.push('  affine-cli doctor');
  lines.push('  affine-cli workspace list');
  lines.push('  affine-cli docs create --title "My Doc"');
  lines.push('  affine-cli completion bash >> ~/.bashrc');

  console.log(lines.join('\n'));
}

// ---------------------------------------------------------------------------
// CLI 主入口
// ---------------------------------------------------------------------------
export async function runCli(args: string[]): Promise<boolean> {
  const [command, ...remainingArgs] = args;

  // 版本信息
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(VERSION);
    return true;
  }

  // 帮助信息
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    if (remainingArgs.length > 0) {
      const target = remainingArgs[0];
      // 检查是否是内置命令
      if (BUILTIN_COMMANDS[target]) {
        console.log(`affine-cli ${target}`);
        console.log(`\n${BUILTIN_COMMANDS[target].summary}`);
        return true;
      }
      // 检查是否是模块
      if (CLI_MODULES[target]) {
        console.log(generateHelp(CLI_MODULES[target]));
        return true;
      }
    }
    printMainHelp();
    return true;
  }

  // 检查内置命令
  if (BUILTIN_COMMANDS[command]) {
    try {
      await BUILTIN_COMMANDS[command].handler(remainingArgs);
      return true;
    } catch (err: any) {
      if (err instanceof CliError) {
        console.error(`✗ ${err.message}`);
        process.exit(1);
      }
      throw err;
    }
  }

  // 检查模块
  const module = CLI_MODULES[command];
  if (module) {
    const [actionName, ...moduleArgs] = remainingArgs;

    // 无 action 或请求帮助
    if (!actionName || actionName === 'help' || moduleArgs.includes('--help') || moduleArgs.includes('-h')) {
      console.log(generateHelp(module, actionName));
      return true;
    }

    // 查找动作
    const action = module.actions[actionName];
    if (!action) {
      console.error(`Unknown action: ${actionName} for module: ${command}`);
      console.error(`Run 'affine-cli ${command} --help' for available actions.`);
      return false;
    }

    // 执行动作
    try {
      const result = await action.handler(moduleArgs);
      outputResult(result, result.success ? 0 : 1);
      return result.success;
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      return false;
    }
  }

  console.error(`Unknown command: ${command}`);
  printMainHelp();
  return false;
}

// ---------------------------------------------------------------------------
// 入口点
// ---------------------------------------------------------------------------
const rawArgs = process.argv.slice(2);
const cliArgs = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;

runCli(cliArgs)
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });

// 导出模块供外部使用
export { CLI_MODULES, BUILTIN_COMMANDS };
