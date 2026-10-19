import type { Command } from "commander";
import {
    PrivateOffersService,
    type PrivateOffer,
    type PrivateOfferListFilter,
} from "../services/private-offers-service.js";
import { ConfigureJobPoller } from "../services/configure-job-poller.js";

export class PrivateOfferCommandsBuilder {
    private readonly jobPoller: ConfigureJobPoller;

    public constructor() {
        this.jobPoller = new ConfigureJobPoller();
    }

    public addPrivateOfferCommands(program: Command): void {
        const privateOffersCommand = program
            .command("private-offers")
            .description("Work with private offers through the PrivateOffersService");

        this.createPrivateOfferCommand(privateOffersCommand);
        this.deletePrivateOfferCommand(privateOffersCommand);
        this.getPrivateOfferCommand(privateOffersCommand);
        this.listPrivateOffersCommand(privateOffersCommand);
        this.withdrawPrivateOfferCommand(privateOffersCommand);
    }
    
    private createPrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("create")
            .description("Create a new private offer")
            .argument("<name>", "name of the private offer")
            .action(async (name: string) => {
                const privateOffersService = new PrivateOffersService();
                const result = await privateOffersService.createPrivateOffer(name);
                await this.jobPoller.pollUntilComplete(result);
            });
    }

    private listPrivateOffersCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("list")
            .description("List all private offers, including multiparty private offers")
            .option("--name <name>", "keep offers whose name contains this text (case-insensitive)")
            .option("--state <state>", "keep offers with this state (for example draft, live, withdrawn)")
            .option("--sub-state <subState>", "keep offers with this subState")
            .action(async (options: PrivateOfferListFilter) => {
                const privateOffersService = new PrivateOffersService();
                const privateOffers = await privateOffersService.listPrivateOffers(options);
                console.log(JSON.stringify(privateOffers, null, 2));
            });
    }

    private getPrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("get")
            .description("Get a private offer by its id")
            .argument("<id>", "private offer id")
            .action(async (id: string) => {
                const privateOffersService = new PrivateOffersService();
                const privateOffer = await privateOffersService.getPrivateOffer(id) as PrivateOffer;
                console.error(`Private offer: ${privateOffer.id}`);
                console.log(JSON.stringify(privateOffer, null, 2));
            });
    }

    private deletePrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("delete")
            .description("Delete a private offer")
            .argument("<id>", "private offer id")
            .action(async (id: string) => {
                const privateOffersService = new PrivateOffersService();
                const result = await privateOffersService.deletePrivateOffer(id);
                await this.jobPoller.pollUntilComplete(result);
            });
    }

    private withdrawPrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("withdraw")
            .description("Withdraw a private offer (configure state draft)")
            .argument("<id>", "private offer id")
            .action(async (id: string) => {
                const privateOffersService = new PrivateOffersService();
                const result = await privateOffersService.withdrawPrivateOffer(id);
                await this.jobPoller.pollUntilComplete(result);
            });
    }
}
