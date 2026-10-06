import type { Command } from "commander";
import { PrivateOffersService, type PrivateOffer } from "../services/private-offers-service.js";
import { globalsFrom, type GlobalOptions } from "./options.js";
import { PrivateOfferSchemas } from "../services/private-offers-service.js";

export class PrivateOfferCommandsBuilder {
    
    public addPrivateOfferCommands(program: Command): void {
        const privateOffersCommand = program
            .command("private-offers")
            .description("Work with private offers through the PrivateOffersService");

        this.addListPrivateOffersCommand(privateOffersCommand);
        this.addGetPrivateOfferCommand(privateOffersCommand);
        this.addRenamePrivateOfferCommand(privateOffersCommand);
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

    private addRenamePrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("rename")
            .description("Rename a private offer")
            .argument("<id>", "private offer id")
            .argument("<name>", "new name for the private offer")
            .action(async (id: string, name: string, _options: unknown, command: Command) => {
                const globals = globalsFrom(command) as GlobalOptions;
                const privateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                
                const privateOffer = await privateOffersService.getPrivateOffer(id) as PrivateOffer;
                privateOffer.name = name;

                const result = await privateOffersService.postPrivateOfferConfiguration({
                    $schema: PrivateOfferSchemas.Configure,
                    resources: [
                        privateOffer
                    ],
                });

                console.log(`Result job ID: ${result.jobId}`);
                console.log(JSON.stringify(result, null, 2));

                // poll for the job to complete
                let job = result;
                while (job.jobStatus !== "completed") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    job = await privateOffersService.getConfigureJobStatus(job.jobId);
                    console.log(JSON.stringify(job, null, 2));
                }
            });
    }
}
