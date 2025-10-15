/**
 * Example usage of MCP deep linking utilities
 * This file demonstrates how to use the deep linking functions
 */

import {
  generateMCPDeepLink,
  parseMCPDeepLink,
  validateMCPConfig,
  MCP_CLIENTS,
  type MCPStdioConfig,
  type MCPHttpConfig,
} from '../mcpDeepLink';

// ============================================================================
// Example 1: Generate a stdio-based MCP deep link for Cursor
// ============================================================================

const starknetMCPConfig: MCPStdioConfig = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@kasarlabs/ask-starknet-mcp'],
  // Note: env is intentionally excluded from deep links for security
};

const cursorDeepLink = generateMCPDeepLink(
  'cursor',
  'Ask Starknet MCP',
  starknetMCPConfig,
  false // Don't include env variables
);

console.log('Cursor Deep Link:', cursorDeepLink);
// Output: cursor://anysphere.cursor-deeplink/mcp/install?name=Ask%20Starknet%20MCP&config=...

// ============================================================================
// Example 2: Generate deep links for all supported clients
// ============================================================================

console.log('\nDeep links for all clients:');
MCP_CLIENTS.forEach((client) => {
  const link = generateMCPDeepLink(
    client.id,
    'Ask Starknet MCP',
    starknetMCPConfig,
    false
  );
  console.log(`${client.name}: ${link}`);
});

// ============================================================================
// Example 3: Parse a deep link back to configuration
// ============================================================================

const exampleDeepLink = 'cursor://anysphere.cursor-deeplink/mcp/install?name=Test%20MCP&config=%7B%22type%22%3A%22stdio%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22test%22%5D%7D';

try {
  const { displayName, config } = parseMCPDeepLink(exampleDeepLink);
  console.log('\nParsed deep link:');
  console.log('Display Name:', displayName);
  console.log('Config:', JSON.stringify(config, null, 2));
} catch (error) {
  console.error('Failed to parse deep link:', error);
}

// ============================================================================
// Example 4: Validate MCP configurations
// ============================================================================

const validStdioConfig: MCPStdioConfig = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', 'my-mcp-server'],
};

const validHttpConfig: MCPHttpConfig = {
  type: 'http',
  url: 'https://example.com/mcp',
};

const invalidConfig = {
  type: 'stdio',
  // Missing required fields
};

console.log('\nConfig validation:');
console.log('Valid stdio config:', validateMCPConfig(validStdioConfig)); // true
console.log('Valid http config:', validateMCPConfig(validHttpConfig)); // true
console.log('Invalid config:', validateMCPConfig(invalidConfig)); // false

// ============================================================================
// Example 5: HTTP-based MCP configuration
// ============================================================================

const httpMCPConfig: MCPHttpConfig = {
  type: 'http',
  url: 'https://api.starknet.example/mcp',
};

const httpDeepLink = generateMCPDeepLink(
  'vscode',
  'Starknet HTTP MCP',
  httpMCPConfig
);

console.log('\nHTTP-based MCP deep link:', httpDeepLink);

// ============================================================================
// Example 6: Error handling
// ============================================================================

try {
  // This will throw an error because 'unknown-client' is not supported
  generateMCPDeepLink('unknown-client', 'Test', starknetMCPConfig);
} catch (error) {
  console.error('\nExpected error for unknown client:', error);
}

try {
  // This will throw an error because the URL is malformed
  parseMCPDeepLink('not-a-valid-url');
} catch (error) {
  console.error('Expected error for invalid URL:', error);
}

// ============================================================================
// Example 7: Usage in a React component
// ============================================================================

/*
import { generateMCPDeepLink, openDeepLink, MCP_CLIENTS } from '@/lib/mcpDeepLink';

function MCPInstallButton() {
  const handleInstall = () => {
    const config = {
      type: 'stdio' as const,
      command: 'npx',
      args: ['-y', '@kasarlabs/ask-starknet-mcp'],
    };
    
    const deepLink = generateMCPDeepLink('cursor', 'Ask Starknet', config);
    openDeepLink(deepLink);
  };

  return (
    <button onClick={handleInstall}>
      Install in Cursor
    </button>
  );
}
*/

// ============================================================================
// Example 8: Complete configuration with environment variables
// ============================================================================

const completeConfig: MCPStdioConfig = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@kasarlabs/ask-starknet-mcp'],
  env: {
    STARKNET_PUBLIC_ADDRESS: '0x1234...',
    STARKNET_PRIVATE_KEY: 'secret-key',
    STARKNET_RPC_URL: 'https://rpc.starknet.io',
    MODEL_API_KEY: 'api-key',
  },
};

// Generate link WITHOUT env (recommended for security)
const secureLink = generateMCPDeepLink(
  'cursor',
  'Ask Starknet',
  completeConfig,
  false
);

// Generate link WITH env (only if necessary and secure channel)
const linkWithEnv = generateMCPDeepLink(
  'cursor',
  'Ask Starknet',
  completeConfig,
  true
);

console.log('\nSecure link (no env):', secureLink);
console.log('Link with env:', linkWithEnv);
console.log('\n⚠️  Warning: Including environment variables in deep links is not recommended!');

