/**
 * Utility functions for generating MCP deep links following the Smithery protocol
 * @see https://docs.smithery.ai/deep-linking
 */

export interface MCPClient {
  id: string;
  name: string;
  scheme: string;
  handler?: string;
  icon: string;
  description: string;
}

export interface MCPStdioConfig {
  type: 'stdio';
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPHttpConfig {
  type: 'http';
  url: string;
}

export type MCPConfig = MCPStdioConfig | MCPHttpConfig;

/**
 * Supported MCP clients with their protocol schemes and handlers
 */
export const MCP_CLIENTS: MCPClient[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    scheme: 'cursor',
    handler: 'anysphere.cursor-deeplink',
    icon: '/cursor.avif',
    description: 'AI-first code editor',
  },
  {
    id: 'vscode',
    name: 'VS Code',
    scheme: 'vscode',
    handler: 'mcp',
    icon: '/vscode.svg',
    description: 'Visual Studio Code',
  },
  {
    id: 'claude',
    name: 'Claude',
    scheme: 'claude',
    handler: 'mcp',
    icon: '/claude-code.svg',
    description: 'Claude AI Assistant',
  },
  {
    id: 'raycast',
    name: 'Raycast',
    scheme: 'raycast',
    handler: 'mcp',
    icon: '/raycast.svg',
    description: 'Raycast productivity tool',
  },
];

/**
 * Generates a deep link for installing an MCP server in a specific client
 *
 * @param clientId - The ID of the client (cursor, vscode, etc.)
 * @param displayName - The display name for the MCP server
 * @param config - The MCP configuration (stdio or http)
 * @param includeEnv - Whether to include environment variables (default: false for security)
 * @returns The generated deep link URL
 *
 * @example
 * ```typescript
 * const link = generateMCPDeepLink('cursor', 'My MCP Server', {
 *   type: 'stdio',
 *   command: 'npx',
 *   args: ['-y', '@my/mcp-server']
 * });
 * // Returns: cursor://anysphere.cursor-deeplink/mcp/install?name=...&config=...
 * ```
 */
export function generateMCPDeepLink(
  clientId: string,
  displayName: string,
  config: MCPConfig,
  includeEnv: boolean = false,
): string {
  const client = MCP_CLIENTS.find((c) => c.id === clientId);
  if (!client) {
    throw new Error(`Unknown MCP client: ${clientId}`);
  }

  // For security, exclude environment variables by default
  let configToEncode: MCPConfig;
  if (config.type === 'stdio' && !includeEnv) {
    configToEncode = {
      type: config.type,
      command: config.command,
      args: config.args,
    };
  } else {
    configToEncode = config;
  }

  const configJson = JSON.stringify(configToEncode);
  const encodedConfig = encodeURIComponent(configJson);
  const encodedName = encodeURIComponent(displayName);

  const handler = client.handler ? `${client.handler}/` : '';
  return `${client.scheme}://${handler}mcp/install?name=${encodedName}&config=${encodedConfig}`;
}

/**
 * Parses a deep link URL to extract the MCP configuration
 *
 * @param url - The deep link URL to parse
 * @returns An object containing the display name and configuration
 *
 * @example
 * ```typescript
 * const { displayName, config } = parseMCPDeepLink(deepLinkUrl);
 * console.log(displayName); // "My MCP Server"
 * console.log(config.type); // "stdio"
 * ```
 */
export function parseMCPDeepLink(url: string): {
  displayName: string;
  config: MCPConfig;
} {
  try {
    const urlObj = new URL(url);
    const name = urlObj.searchParams.get('name');
    const configParam = urlObj.searchParams.get('config');

    if (!name || !configParam) {
      throw new Error('Missing name or config parameter');
    }

    const displayName = decodeURIComponent(name);
    const config = JSON.parse(decodeURIComponent(configParam)) as MCPConfig;

    return { displayName, config };
  } catch (error) {
    throw new Error(
      `Invalid MCP deep link: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validates an MCP configuration object
 *
 * @param config - The configuration to validate
 * @returns True if valid, false otherwise
 */
export function validateMCPConfig(config: unknown): config is MCPConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const cfg = config as Record<string, unknown>;

  if (cfg.type === 'stdio') {
    return (
      typeof cfg.command === 'string' &&
      Array.isArray(cfg.args) &&
      cfg.args.every((arg) => typeof arg === 'string')
    );
  }

  if (cfg.type === 'http') {
    return typeof cfg.url === 'string' && isValidUrl(cfg.url);
  }

  return false;
}

/**
 * Checks if a string is a valid URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens a deep link in the user's system
 *
 * @param url - The deep link URL to open
 * @returns True if the link was successfully opened, false otherwise
 */
export function openDeepLink(url: string): boolean {
  try {
    window.open(url, '_blank');
    return true;
  } catch (error) {
    console.error('Failed to open deep link:', error);
    return false;
  }
}

/**
 * Copies text to the clipboard
 *
 * @param text - The text to copy
 * @returns A promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
