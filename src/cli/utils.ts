/**
 * CLI 命令执行结果类型
 */
export type CommandResult = {
	success: boolean;
	output?: string;
	error?: string;
	data?: any;
	raw?: any;
};

/**
 * 解析 core 函数返回的结果
 * core 函数返回 { content: [{ type: 'text', text: '...' }] } 格式
 */
export function parseCoreResult(result: any): any {
	if (!result) return result;
	if (typeof result === 'string') {
		try {
			return JSON.parse(result);
		} catch {
			return result;
		}
	}
	if (result.content && Array.isArray(result.content)) {
		const text = result.content[0]?.text;
		if (text) {
			try {
				return JSON.parse(text);
			} catch {
				return text;
			}
		}
	}
	return result;
}

/**
 * CLI 命令处理器类型
 */
export type CommandHandler = (args: string[]) => Promise<CommandResult>;

/**
 * 核心函数类型
 * 定义核心模块中处理函数的类型
 */
export type CoreHandler<T = any> = (params: T) => Promise<any>;

/**
 * CLI 模块定义
 * 定义 CLI 模块的结构，包含模块名称、描述和操作映射
 */
export type CliModule = {
	name: string;
	description: string;
	actions: Record<string, CliAction>;
};

/**
 * CLI 操作定义
 * 定义单个 CLI 操作的结构，包含操作名称、描述、用法和处理函数
 */
export type CliAction = {
	name: string;
	description: string;
	usage: string;
	handler: CommandHandler;
	args?: ArgDef[];
};

/**
 * 参数定义
 * 定义命令行参数的结构，包含名称、短选项、描述、是否必填、默认值和类型
 */
export type ArgDef = {
	name: string;
	short?: string;
	description: string;
	required?: boolean;
	default?: string;
	type: 'string' | 'number' | 'boolean';
};

/**
 * 命令处理器工厂选项
 * 定义创建命令处理器时的配置选项
 */
export type CommandHandlerOptions<T = any> = {
	/**
	 * 参数定义数组
	 */
	args: ArgDef[];
	/**
	 * 核心模块导入函数
	 * 用于动态导入核心模块
	 */
	coreImport: () => Promise<any>;
	/**
	 * 核心处理方法名称
	 * 指定要调用的核心模块中的方法名
	 */
	coreMethod: string;
	/**
	 * 参数映射函数
	 * 将解析后的命令行参数映射为核心方法需要的参数格式
	 */
	paramsMapper?: (parsed: Record<string, any>) => T;
	/**
	 * 默认输出格式
	 * 当命令行未指定格式时使用的默认格式
	 */
	format?: 'text' | 'json';
};

/**
 * 创建 CLI 命令处理器的工厂函数
 * 减少重复的参数解析、错误处理和结果格式化逻辑
 *
 * @param options 命令处理器配置选项
 * @returns 返回一个命令处理器函数
 */
export function createCommandHandler<T = any>(options: CommandHandlerOptions<T>): CommandHandler {
	return async (args: string[]): Promise<CommandResult> => {
		// 解析命令行参数
		const { parsed, errors } = parseArgs(args, options.args);

		// 处理参数解析错误
		if (errors.length > 0) {
			return { success: false, error: errors.join('\n') };
		}

		try {
			// 动态导入核心模块
			const coreModule = await options.coreImport();
			// 获取核心处理方法
			const coreHandler = coreModule[options.coreMethod] as CoreHandler<T>;

			// 映射参数
			const params = options.paramsMapper ? options.paramsMapper(parsed) : (parsed as T);
			// 调用核心处理方法
			const result = await coreHandler(params);
			// 解析核心处理方法的返回结果
			const data = parseCoreResult(result);

			// 返回成功结果
			return {
				success: true,
				output: formatOutput(
					data,
					(parsed.format as 'text' | 'json') || options.format || 'text'
				)
			};
		} catch (error: any) {
			// 处理执行错误
			return { success: false, error: error.message };
		}
	};
}

/**
 * 解析命令行参数
 * @param args 原始参数数组
 * @param argDefs 参数定义
 * @returns 解析后的参数对象和剩余的位置参数
 */
export function parseArgs(
	args: string[],
	argDefs: ArgDef[]
): {
	parsed: Record<string, any>;
	positional: string[];
	errors: string[];
} {
	const parsed: Record<string, any> = {};
	const errors: string[] = [];
	const positional: string[] = [];

	// 初始化所有参数为默认值
	for (const def of argDefs) {
		parsed[def.name] = def.default;
	}

	let i = 0;
	while (i < args.length) {
		const arg = args[i];

		// 检查是否是帮助参数
		if (arg === '-h' || arg === '--help') {
			parsed['__help__'] = true;
			i++;
			continue;
		}

		// 检查是否是位置参数（不以 - 开头）
		if (!arg.startsWith('-')) {
			positional.push(arg);
			i++;
			continue;
		}

		// 解析命名参数
		let argName = arg.replace(/^-+/, '');
		let value: string | undefined;

		// 处理 --key=value 格式
		if (argName.includes('=')) {
			const parts = argName.split('=');
			argName = parts[0];
			value = parts.slice(1).join('=');
		}

		// 查找对应的参数定义
		const def = argDefs.find((d) => d.name === argName || d.short === argName);
		if (!def) {
			errors.push(`Unknown option: ${arg}`);
			i++;
			continue;
		}

		// 如果是布尔类型参数
		if (def.type === 'boolean') {
			parsed[def.name] = true;
			i++;
			continue;
		}

		// 获取值
		if (value === undefined) {
			i++;
			if (i >= args.length) {
				errors.push(`Missing value for option: ${arg}`);
				break;
			}
			value = args[i];
		}

		// 类型转换
		if (def.type === 'number') {
			const num = Number(value);
			if (isNaN(num)) {
				errors.push(`Invalid number for ${arg}: ${value}`);
				i++;
				continue;
			}
			parsed[def.name] = num;
		} else {
			parsed[def.name] = value;
		}

		i++;
	}

	// 检查必需参数
	for (const def of argDefs) {
		if (def.required && parsed[def.name] === undefined && parsed[def.name] !== false) {
			errors.push(`Missing required option: --${def.name}`);
		}
	}

	return { parsed, positional, errors };
}

/**
 * 生成帮助文本
 */
export function generateHelp(module: CliModule, actionName?: string): string {
	const lines: string[] = [];

	if (actionName && module.actions[actionName]) {
		// 生成特定操作的帮助
		const action = module.actions[actionName];
		lines.push(`${module.name} ${action.name}`);
		lines.push('');
		lines.push(action.description);
		lines.push('');
		lines.push('Usage:');
		lines.push(`  affine-cli ${module.name} ${action.usage}`);
		lines.push('');

		if (action.args && action.args.length > 0) {
			lines.push('Options:');
			for (const arg of action.args) {
				const required = arg.required ? '(required)' : '(optional)';
				const short = arg.short ? `-${arg.short}, ` : '    ';
				const defaultVal = arg.default !== undefined ? ` [default: ${arg.default}]` : '';
				lines.push(
					`  ${short}--${arg.name} <value>  ${arg.description} ${required}${defaultVal}`
				);
			}
			lines.push('');
		}

		lines.push('Examples:');
		lines.push(`  affine-cli ${module.name} ${action.name} --help`);
	} else {
		// 生成模块帮助
		lines.push(`${module.name} - ${module.description}`);
		lines.push('');
		lines.push('Usage:');
		lines.push(`  affine-cli ${module.name} <action> [options]`);
		lines.push('');
		lines.push('Actions:');

		for (const [name, action] of Object.entries(module.actions)) {
			lines.push(`  ${name.padEnd(16)} ${action.description}`);
		}
		lines.push('');
		lines.push(
			`Run 'affine-cli ${module.name} <action> --help' for more information on a specific action.`
		);
	}

	return lines.join('\n');
}

/**
 * 格式化输出结果
 */
export function formatOutput(data: any, format: 'text' | 'json' = 'text'): string {
	if (format === 'json') {
		return JSON.stringify(data, null, 2);
	}

	if (typeof data === 'string') {
		return data;
	}

	if (Array.isArray(data)) {
		if (data.length === 0) {
			return '(empty)';
		}
		return data.map((item) => formatObject(item)).join('\n');
	}

	if (typeof data === 'object' && data !== null) {
		return formatObject(data);
	}

	return String(data);
}

/**
 * 格式化对象为文本
 */
function formatObject(obj: any, indent = 0): string {
	if (obj === null || obj === undefined) {
		return '(none)';
	}

	if (typeof obj !== 'object') {
		return String(obj);
	}

	const prefix = '  '.repeat(indent);
	const lines: string[] = [];

	for (const [key, value] of Object.entries(obj)) {
		if (value === null || value === undefined) {
			continue;
		}

		if (typeof value === 'object') {
			lines.push(`${prefix}${key}:`);
			lines.push(formatObject(value, indent + 1));
		} else {
			lines.push(`${prefix}${key}: ${value}`);
		}
	}

	return lines.join('\n');
}

/**
 * 输出结果并退出
 */
export function outputResult(result: CommandResult, exitCode = 0): void {
	if (result.success && result.output) {
		console.log(result.output);
	} else if (!result.success && result.error) {
		console.error(result.error);
	}

	if (result.data !== undefined) {
		console.log(JSON.stringify(result.data, null, 2));
	}

	process.exit(exitCode);
}

/**
 * 命令配置类型
 */
export interface CommandConfig {
	name: string;
	description: string;
	usage: string;
	args: ArgDef[];
	coreImport: () => Promise<any>;
	coreMethod: string;
	paramsMapper?: (parsed: any) => any;
}

/**
 * 转换命令配置为 CliAction
 * @param config 命令配置
 * @returns CliAction 对象
 */
export function convertToCliAction(config: CommandConfig): CliAction {
	return {
		name: config.name,
		description: config.description,
		usage: config.usage,
		args: config.args,
		handler: createCommandHandler({
			args: config.args,
			coreImport: config.coreImport,
			coreMethod: config.coreMethod,
			paramsMapper: config.paramsMapper
		})
	};
}

/**
 * 生成命令映射
 * @param commands 命令配置对象
 * @returns 命令映射对象
 */
export function generateCommandMap(
	commands: Record<string, CommandConfig>
): Record<string, CliAction> {
	return Object.fromEntries(
		Object.entries(commands).map(([key, config]) => [key, convertToCliAction(config)])
	);
}
