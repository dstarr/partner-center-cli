import { Client, StreamableHTTPClientTransport, type ServerCapabilities } from '@modelcontextprotocol/client';

export class McpService {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  public constructor() {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'https://ingestion-mcp.marketplace-ingestion.mp.microsoft.com/mcp';

    this.client = new Client({ 
      name: 'partner-center-cli', 
      version: '0.1.0',
      websiteUrl: 'https://partner.microsoft.com',
      description: 'Partner Center CLI',
      icons: [{ src: 'https://partner.microsoft.com/favicon.ico', mimeType: 'image/x-icon' }],
      title: 'Partner Center CLI',
    });
    this.transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl));
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect(this.transport);
    } catch (error) {
      console.error('Error connecting to MCP server:', error);
      throw error;
    }
  }

  public async getServerVersion(): Promise<string> {
    try {
      const version = await this.client.getServerVersion();
      return version?.version || '';
    } catch (error) {
      console.error('Error getting server version:', error);
      return '';
    }
  }

  public async getServerCapabilities(): Promise<ServerCapabilities | undefined> {
    try {
      const capabilities = await this.client.getServerCapabilities();
      return capabilities;
    } catch (error) {
      console.error('Error getting server capabilities:', error);
      return undefined;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.transport.terminateSession();
      await this.client.close();
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
      throw error;
    }
  }
}