import { Command } from "commander";
import { EndpointService } from "./services/endpoint-service.js";
import { RequestService } from "./services/request-service.js";
import { ProgramCommandBuilder } from "./commands/program-commands-builder.js";
import { ProductCommandsBuilder } from "./commands/product-commands-builder.js";

export function createProgram(): Command {
  const endpointService = new EndpointService();
  const requestService = new RequestService();

  const program: Command = new ProgramCommandBuilder(endpointService, requestService).getProgramCommand();

  new ProductCommandsBuilder().addProductCommands(program);

  return program;
}

