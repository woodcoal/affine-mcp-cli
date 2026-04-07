# AFFiNE CLI & MCP Server

集成 AFFiNE (自托管或云端) 的模型上下文协议 (MCP) 服务器和命令行界面 (CLI)。它通过 stdio (默认) 或 HTTP (`/mcp`) 向 AI 助手暴露 AFFiNE 工作区和文档，并提供功能强大的模块化 CLI 用于手动操作。

[![Version](https://img.shields.io/badge/version-1.11.2-blue)](https://github.com/woodcoal/affine-cli/releases)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.17.2-green)](https://github.com/modelcontextprotocol/typescript-sdk)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

## 概述

- **用途**: 通过 MCP 或 CLI 管理 AFFiNE 工作区和文档
- **传输方式**: stdio (默认) 和可选的 HTTP (`/mcp`) 用于远程 MCP 部署
- **身份验证**: API 令牌、Cookie 或电子邮件/密码 (按优先级排序)
- **工具**: 76+ 个专用工具，支持基于 WebSocket 的文档编辑
- **CLI**: 用于直接交互的模块化命令行工具

> **注意**: 本项目是 [dawncr0w/affine-mcp-server](https://github.com/dawncr0w/affine-mcp-server) 的分叉并基于其原创工作。

## 功能特性

- **工作区**: 创建 (含初始文档)、读取、更新、删除
- **文档**: 列表/获取/读取/发布/撤销 + 创建/追加/替换/删除 + Markdown 导入/导出 + 标签 (基于 WebSocket)
- **侧边栏数据**: 收藏集、文件夹和 AFFiNE 工作区树的组织链接
- **数据库工作流**: 创建数据库区块、检查模式、添加/更新/删除行，并通过 MCP 工具读取或更新单元格值
- **评论**: 完整的增删改查和解决功能
- **版本历史**: 列表查看
- **用户和令牌**: 当前用户、登录、个人资料/设置以及个人访问令牌
- **通知**: 列表查看并标记为已读
- **Blob 存储**: 上传/删除/清理

## 环境要求

- Node.js 18+
- AFFiNE 实例 (自托管或云端)
- 有效的 AFFiNE 凭据或访问令牌

## 安装

```bash
# 克隆仓库
git clone https://github.com/woodcoal/affine-cli.git
cd affine-cli

# 安装依赖
npm install

# 构建项目
npm run build

# 链接到全局使用
npm link
```

该软件包提供两个二进制文件：
- `affine-cli`: 主要的模块化 CLI 工具。
- `affine-mcp`: MCP 服务器封装。

## 配置

### 交互式登录 (推荐)

配置凭据的最简单方法：

```bash
affine-cli login
```

这将凭据存储在 `~/.affine-cli/affine-cli.env` (权限 600)。MCP 服务器和 CLI 会自动读取它们。

**AFFiNE Cloud** (`app.affine.pro`): 系统会提示您从“设置” → “账户设置” → “集成” → “MCP Server”中粘贴 API 令牌。

**自托管实例**: 您可以使用 API 令牌或电子邮件/密码。

### 其他 CLI 命令

- `affine-cli status` — 显示当前配置并测试连接
- `affine-cli doctor` — 运行配置和连接诊断
- `affine-cli show-config` — 打印脱敏后的生效配置
- `affine-cli snippet <claude|cursor|codex|all> [--env]` — 打印可直接粘贴的客户端配置代码片段
- `affine-cli logout` — 移除存储的凭据
- `affine-cli --version` — 打印安装的版本

### 环境变量

环境变量会覆盖配置文件：

- 必填: `AFFINE_BASE_URL`
- 身份验证: `AFFINE_API_TOKEN` | `AFFINE_COOKIE` | `AFFINE_EMAIL` + `AFFINE_PASSWORD`
- 可选: `AFFINE_WORKSPACE_ID`, `AFFINE_DISABLED_GROUPS`, `AFFINE_DISABLED_TOOLS`

## 快速开始

### Claude Code / Desktop

添加到您的 MCP 配置中：

```json
{
  "mcpServers": {
    "affine": {
      "command": "affine-mcp"
    }
  }
}
```

服务器会自动读取 `~/.affine-cli/affine-cli.env`。

### Cursor

在 Cursor 设置中添加 MCP 服务器：
- **类型**: `command`
- **命令**: `affine-mcp`

## 远程服务器 (HTTP 模式)

在远程部署时以 HTTP 模式运行服务器：

```bash
export MCP_TRANSPORT=http
export AFFINE_API_TOKEN="您的令牌..."
npm run start:http
```

## 可用工具

### 工作区
- `list_workspaces` – 列出所有工作区。
- `get_workspace` – 获取工作区详情。
- `create_workspace` – 创建包含初始文档的工作区。
- `update_workspace` – 更新工作区设置。
- `delete_workspace` – 永久删除工作区。
- `list_workspace_tree` – 以树形结构返回工作区文档层次结构。
- `get_orphan_docs` – 查找未从任何父文档链接的文档。

### 组织管理
- `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` – 管理收藏集。
- `add_doc_to_collection`, `remove_doc_from_collection` – 管理收藏集文档。
- `create_folder`, `rename_folder`, `delete_folder`, `move_organize_node` – 管理文件夹。
- `add_organize_link`, `delete_organize_link` – 管理侧边栏链接。

### 文档管理
- `list_docs`, `search_docs`, `get_doc`, `get_doc_by_title` – 查找和读取文档。
- `create_doc`, `delete_doc`, `update_doc_title` – 基本文档增删改查。
- `create_doc_from_markdown`, `export_doc_markdown`, `append_markdown`, `replace_doc_with_markdown` – Markdown 支持。
- `append_paragraph`, `append_block` – 编辑文档内容。
- `list_tags`, `create_tag`, `add_tag_to_doc`, `remove_tag_from_doc` – 标签管理。
- `read_database_columns`, `read_database_cells`, `add_database_row`, `update_database_cell`, `delete_database_row` – 数据库操作。
- `list_children`, `list_backlinks`, `move_doc`, `duplicate_doc` – 结构和导航。

### 其他
- **评论**: `list_comments`, `create_comment`, `update_comment`, `delete_comment`, `resolve_comment`.
- **历史**: `list_histories`.
- **用户**: `current_user`, `sign_in`, `update_profile`.
- **令牌**: `list_access_tokens`, `generate_access_token`, `revoke_access_token`.
- **通知**: `list_notifications`, `read_all_notifications`.
- **Blob**: `upload_blob`, `delete_blob`, `cleanup_blobs`.

## 致谢

本项目基于 [dawncr0w/affine-mcp-server](https://github.com/dawncr0w/affine-mcp-server)。我们感谢原作者奠定的基础。

## 许可协议

MIT © [The AFFiNE CLI Contributors](LICENSE) & [木炭 <woodcoal@qq.com>](https://github.com/woodcoal/affine-cli)
