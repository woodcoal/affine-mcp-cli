import { loadConfig } from '../config.js';

export function text(data: unknown) {
	const text = typeof data === 'string' ? data : JSON.stringify(data);
	return { content: [{ type: 'text' as const, text }] };
}

/**
 * 获取默认的工作区 ID
 */
export function getDefaultWorkspaceId(): string | undefined {
	const config = loadConfig();
	return config.defaultWorkspaceId;
}
