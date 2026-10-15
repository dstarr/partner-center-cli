import type { Command } from "commander";

export class McpCommandsBuilder {
    public addMcpCommands(program: Command): void {
        const mcpCommand = program
            .command("mcp")
            .description("Model Context Protocol helpers");

        this.addQueryCommand(mcpCommand);
    }

    private addQueryCommand(mcpCommand: Command): void {
        mcpCommand
            .command("query")
            .description("Run a query string (placeholder: echoes the input)")
            .argument("<query...>", "arbitrary query text")
            .action((queryParts: string[]) => {
                console.log(queryParts.join(" "));
            });
    }
}
