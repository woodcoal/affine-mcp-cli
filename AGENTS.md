# AGENTS.md - AFFiNE MCP Server

## 项目概述

AFFiNE MCP Server 是一个 MCP（Model Context Protocol）服务器，通过 stdio（默认）或 HTTP 传输连接 AFFiNE 工作区和文档。

## 开发命令

```bash
# 安装依赖
npm ci

# 构建
npm run build

# 质量检查（CI 流水线）
npm run ci  # = build + test:tool-manifest + pack:check

# 本地测试（需要 AFFiNE 实例）
AFFINE_BASE_URL=http://localhost:3010 \
AFFINE_EMAIL=dev@affine.pro \
AFFINE_PASSWORD=dev \
npm run test:comprehensive
```

## 工具管理

- 工具注册在 `src/mcp/*.ts` 文件中（按功能分组）
- `tool-manifest.json` 是工具清单的权威来源
- **任何工具变更必须同步更新 `tool-manifest.json`**
- 运行 `npm run test:tool-manifest` 验证一致性

## 分支与发布

- PR 只允许提交到 `develop` 分支（CI 强制执行）
- 发布准备从 `release/x.y.z` 分支进行，然后合并到 `main`
- 发布前同步：`package.json`、`package-lock.json`、`tool-manifest.json`、`README.md`、`CHANGELOG.md`、`RELEASE_NOTES.md`

## CLI 命令

```bash
affine-mcp login          # 交互式登录（推荐）
affine-mcp status         # 显示配置和连接状态
affine-mcp doctor         # 诊断工具
affine-mcp logout         # 清除凭证
affine-mcp snippet <client> # 生成客户端配置片段
```

## 配置

- 配置优先级（从高到低）：环境变量 > 本地 `.env` > 全局 `~/.affine-cli/affine-cli.env`
- 全局配置文件位置：`~/.affine-cli/affine-cli.env`（mode 600）
- 本地配置文件位置：运行目录下的 `.env`
- 认证优先级：`AFFINE_API_TOKEN` → `AFFINE_COOKIE` → `AFFINE_EMAIL` + `AFFINE_PASSWORD`
- Cloudflare 注意：AFFiNE Cloud (`app.affine.pro`) 阻止 email/password 登录，需使用 API Token

## 传输模式

- stdio（默认）：桌面 MCP 客户端
- HTTP：`MCP_TRANSPORT=http` + `npm run start:http`

## 关键文件

- `src/index.ts` - 入口点，工具注册和传输选择
- `src/config.ts` - 配置加载和验证
- `src/mcp/*.ts` - 工具注册（按功能模块）
- `src/core/*.ts` - 工具实现逻辑
- `src/client/` - GraphQL 客户端、WebSocket、HTTP 服务
