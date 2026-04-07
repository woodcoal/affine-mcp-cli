# AFFiNE CLI & MCP Server

A Model Context Protocol (MCP) server and Command Line Interface (CLI) that integrates with AFFiNE (self‑hosted or cloud). It exposes AFFiNE workspaces and documents to AI assistants over stdio (default) or HTTP (`/mcp`), and provides a powerful modular CLI for manual operations.

[![Version](https://img.shields.io/badge/version-1.11.2-blue)](https://github.com/woodcoal/affine-cli/releases)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.17.2-green)](https://github.com/modelcontextprotocol/typescript-sdk)
[![License](https://img.shields.io/badge/license-MIT-yellow)](LICENSE)

[English](README.md) | [简体中文](README.zh-CN.md)

## Overview

- **Purpose**: Manage AFFiNE workspaces and documents through MCP or CLI
- **Transport**: stdio (default) and optional HTTP (`/mcp`) for remote MCP deployments
- **Auth**: API Token, Cookie, or Email/Password (priority order)
- **Tools**: 76+ focused tools with WebSocket-based document editing
- **CLI**: Modular command-line tool for direct interaction

> **Note**: This project is a fork of and based on the original work by [dawncr0w/affine-mcp-server](https://github.com/dawncr0w/affine-mcp-server).

## Features

- **Workspace**: create (with initial doc), read, update, delete
- **Documents**: list/get/read/publish/revoke + create/append/replace/delete + markdown import/export + tags (WebSocket‑based)
- **Sidebar data**: collections, folders, and organize links for AFFiNE workspace trees
- **Database workflows**: create database blocks, inspect schema, add/update/delete rows, and read or update cell values via MCP tools
- **Comments**: full CRUD and resolve
- **Version History**: list
- **Users & Tokens**: current user, sign in, profile/settings, and personal access tokens
- **Notifications**: list and mark as read
- **Blob storage**: upload/delete/cleanup

## Requirements

- Node.js 18+
- An AFFiNE instance (self‑hosted or cloud)
- Valid AFFiNE credentials or access token

## Installation

```bash
# Clone the repository
git clone https://github.com/woodcoal/affine-cli.git
cd affine-cli

# Install dependencies
npm install

# Build the project
npm run build

# Link for global use
npm link
```

The package provides two binaries:
- `affine-cli`: The main modular CLI tool.
- `affine-mcp`: The MCP server wrapper.

## Configuration

### Interactive login (recommended)

The easiest way to configure credentials:

```bash
affine-cli login
```

This stores credentials in `~/.affine-cli/affine-cli.env` (mode 600). The MCP server and CLI read them automatically.

**AFFiNE Cloud** (`app.affine.pro`): you'll be prompted to paste an API token from Settings → Account Settings → Integrations → MCP Server.

**Self-hosted instances**: you can use an API token or email/password.

### Other CLI commands

- `affine-cli status` — show current config and test connection
- `affine-cli doctor` — run config and connectivity diagnostics
- `affine-cli show-config` — print the effective config with secrets redacted
- `affine-cli snippet <claude|cursor|codex|all> [--env]` — print ready-to-paste client configuration snippets
- `affine-cli logout` — remove stored credentials
- `affine-cli --version` — print the installed version

### Environment variables

Environment variables override the config file:

- Required: `AFFINE_BASE_URL`
- Auth: `AFFINE_API_TOKEN` | `AFFINE_COOKIE` | `AFFINE_EMAIL` + `AFFINE_PASSWORD`
- Optional: `AFFINE_WORKSPACE_ID`, `AFFINE_DISABLED_GROUPS`, `AFFINE_DISABLED_TOOLS`

## Quick Start

### Claude Code / Desktop

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "affine": {
      "command": "affine-mcp"
    }
  }
}
```

The server reads `~/.affine-cli/affine-cli.env` automatically.

### Cursor

Add an MCP server in Cursor settings:
- **Type**: `command`
- **Command**: `affine-mcp`

## Remote Server (HTTP Mode)

Run the server in HTTP mode for remote deployments:

```bash
export MCP_TRANSPORT=http
export AFFINE_API_TOKEN="your_token..."
npm run start:http
```

## Available Tools

### Workspace
- `list_workspaces` – List all workspaces.
- `get_workspace` – Get workspace details.
- `create_workspace` – Create workspace with initial document.
- `update_workspace` – Update workspace settings.
- `delete_workspace` – Delete workspace permanently.
- `list_workspace_tree` – Return the workspace document hierarchy as a tree.
- `get_orphan_docs` – Find documents that are not linked from any parent doc.

### Organization
- `list_collections`, `get_collection`, `create_collection`, `update_collection`, `delete_collection` – Manage collections.
- `add_doc_to_collection`, `remove_doc_from_collection` – Manage collection documents.
- `create_folder`, `rename_folder`, `delete_folder`, `move_organize_node` – Manage folders.
- `add_organize_link`, `delete_organize_link` – Manage sidebar links.

### Documents
- `list_docs`, `search_docs`, `get_doc`, `get_doc_by_title` – Find and read documents.
- `create_doc`, `delete_doc`, `update_doc_title` – Basic document CRUD.
- `create_doc_from_markdown`, `export_doc_markdown`, `append_markdown`, `replace_doc_with_markdown` – Markdown support.
- `append_paragraph`, `append_block` – Edit document content.
- `list_tags`, `create_tag`, `add_tag_to_doc`, `remove_tag_from_doc` – Tag management.
- `read_database_columns`, `read_database_cells`, `add_database_row`, `update_database_cell`, `delete_database_row` – Database operations.
- `list_children`, `list_backlinks`, `move_doc`, `duplicate_doc` – Structure and navigation.

### Other
- **Comments**: `list_comments`, `create_comment`, `update_comment`, `delete_comment`, `resolve_comment`.
- **History**: `list_histories`.
- **Users**: `current_user`, `sign_in`, `update_profile`.
- **Tokens**: `list_access_tokens`, `generate_access_token`, `revoke_access_token`.
- **Notifications**: `list_notifications`, `read_all_notifications`.
- **Blobs**: `upload_blob`, `delete_blob`, `cleanup_blobs`.

## Acknowledgments

This project is based on [dawncr0w/affine-mcp-server](https://github.com/dawncr0w/affine-mcp-server). We thank the original contributors for their foundational work.

## License

MIT © [The AFFiNE CLI Contributors](LICENSE) & [木炭 <woodcoal@qq.com>](https://github.com/woodcoal/affine-cli)
