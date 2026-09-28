import type { Command } from "commander";
import { PrivateOffersService } from "../services/private-offers-service.js";
import { globalsFrom } from "./options.js";

export class PrivateOfferCommandsBuilder {
    public addPrivateOfferCommands(program: Command): void {
        const privateOffersCommand = program
            .command("private-offers")
            .description("Work with private offers through the PrivateOffersService");

        this.addListPrivateOffersCommand(privateOffersCommand);
    }

    private addListPrivateOffersCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("list")
            .description("List all private offers, including multiparty private offers")
            .action(async (_options: unknown, command: Command) => {
                const globals = globalsFrom(command);
                const privateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                const privateOffers = await privateOffersService.getAllPrivateOffers();
                console.error(`Private offers: ${privateOffers.length}`);
                console.log(JSON.stringify(privateOffers, null, 2));
            });
    }
}
