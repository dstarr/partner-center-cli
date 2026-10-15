import type { Command } from "commander";
import { McpService } from "../services/mcp-service.js";

export class McpCommandsBuilder {
    public addMcpCommands(program: Command): void {
        const mcpCommand = program
            .command("mcp")
            .description("Model Context Protocol helpers");

        this.queryCommand(mcpCommand);
    }

    private queryCommand(mcpCommand: Command): void {

        mcpCommand
            .command("version")
            .description("Get the server version")
            .action(async () => {

                console.log("Version command");
                console.log("This feature is not implemented yet");
                
                
                // Connect to the MCP server
                // const mcpService = new McpService();
                // await mcpService.connect().then(() => {
                //     console.log("Connected to MCP server successfully");
                // });

                // // Get the server version
                // const serverVersion = await mcpService.getServerVersion();
                // console.log(`Server version: ${serverVersion}`);

                // // Disconnect from the MCP server
                // await mcpService.disconnect();
            });
    }
}
