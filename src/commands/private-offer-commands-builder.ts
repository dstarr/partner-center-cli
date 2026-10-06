import type { Command } from "commander";
import { PrivateOffersService } from "../services/private-offers-service.js";
import { globalsFrom, type GlobalOptions } from "./options.js";

export class PrivateOfferCommandsBuilder {
    
    public addPrivateOfferCommands(program: Command): void {
        const privateOffersCommand = program
            .command("private-offers")
            .description("Work with private offers through the PrivateOffersService");

        this.addListPrivateOffersCommand(privateOffersCommand);
        this.addGetPrivateOfferCommand(privateOffersCommand);
    }

    private addListPrivateOffersCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("list")
            .description("List all private offers, including multiparty private offers")
            .action(async (_options: unknown, command: Command) => {
                const globals = globalsFrom(command) as GlobalOptions;
                const privateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                const privateOffers = await privateOffersService.getAllPrivateOffers();
                console.error(`Private offers: ${privateOffers.length}`);
                console.log(JSON.stringify(privateOffers, null, 2));
            });
    }

    private addGetPrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("get")
            .description("Get a private offer by its id")
            .argument("<id>", "private offer id")
            .action(async (id: string, _options: unknown, command: Command) => {
                const globals = globalsFrom(command) as GlobalOptions;
                const privateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                const privateOffer = await privateOffersService.getPrivateOffer(id);
                console.error(`Private offer: ${privateOffer.id}`);
                console.log(JSON.stringify(privateOffer, null, 2));
            });
    }
}
