# AFFiNE CLI & MCP Server

## Project Overview

`affine-cli` is a Node.js-based project providing a Command Line Interface (CLI) and a Model Context Protocol (MCP) server for interacting with AFFiNE. It enables AI assistants (like Claude, Cursor, and Gemini) and users to interact with AFFiNE workspaces, documents, blocks, and collaboration features via GraphQL.

### Key Features

- **Modular CLI:** Command-line access to workspaces, docs, comments, history, and more.
- **MCP Server:** Exposes AFFiNE functionality as tools for AI assistants using the Model Context Protocol.
- **Rich Document Support:** Handles blocks, databases, and markdown roundtrips using Yjs and Markdown-it.
- **Flexible Auth:** Supports API tokens, cookies, email/password login, and OAuth.
- **Tool Filtering:** Ability to disable specific tool groups or individual tools via environment variables.

## Main Technologies

- **Runtime:** Node.js (>= 18)
- **Language:** TypeScript
- **Protocol:** Model Context Protocol (MCP) SDK
- **Data Access:** GraphQL (via `undici` and custom client)
- **Document Engine:** Yjs (for shared state)
- **Web/SSE:** Express (for HTTP/SSE MCP transport)
- **Parsing:** Markdown-it, Zod (validation)

## Project Architecture

- `src/core/`: Core business logic and data models.
    - `docs/`: Block manipulation, CRUD, database handling, markdown conversion, and search.
    - `workspace.ts`: Workspace management logic.
    - `organize.ts`: Collections and folder management.
- `src/cli/`: CLI entry point and modular command implementations (docs, workspaces, users, etc.).
- `src/mcp/`: MCP server implementation, tool registrations, and filtering logic.
- `src/client/`: Implementation of SSE, HTTP, and GraphQL clients.
- `src/markdown/`: Markdown rendering and parsing logic.
- `bin/`: Executable scripts for `affine-cli` and `affine-mcp`.

## Building and Running

### Prerequisites

- Node.js >= 18
- npm

### Key Commands

- **Build:** `npm run build` (Clean and compile TypeScript)
- **Clean:** `npm run clean` (Remove `dist/` directory)
- **Run CLI (Dev):** `npm run dev`
- **Run MCP Server (Dev):** `npm run dev:mcp` (Stdio transport)
- **Run MCP Server (HTTP):** `npm run start:http` (SSE transport)
- **Login:** `affine-cli login` (Interactive setup)
- **Diagnostics:** `affine-cli doctor` (Check configuration and connectivity)

## Testing

- **Main Test Suite:** `npm test`
- **Comprehensive Tests:** `npm run test:comprehensive`
- **E2E Tests:** `npm run test:e2e` (Requires active server environment)
- **Specific Tests:** Many specialized scripts exist for databases, markdown, auth, and tool filtering (see `package.json` scripts).

## Development Conventions

### Configuration

Configuration follows a hierarchy (higher priority first):

1. **Environment Variables** (e.g., `AFFINE_API_TOKEN`, `AFFINE_BASE_URL`)
2. **Local `.env` file** in the current working directory.
3. **Global config file** at `~/.affine-cli/affine-cli.env`.

### Coding Style

- **ES Modules:** The project uses `"type": "module"`.
- **Modular Commands:** When adding CLI commands, register them in `src/cli/index.ts` and implement in a dedicated file in `src/cli/`.
- **Modular MCP Tools:** Register new MCP tools in the relevant group file within `src/mcp/`.
- **Error Handling:** Use custom error classes (like `CliError`) and provide descriptive error messages to the user/LLM.
- **Validation:** Use Zod for validating tool inputs and configuration values.

### Tool Filtering

You can disable specific MCP tool groups or tools using:

- `AFFINE_DISABLED_GROUPS`: e.g., `comments,history`
- `AFFINE_DISABLED_TOOLS`: e.g., `list_workspaces,get_doc`
