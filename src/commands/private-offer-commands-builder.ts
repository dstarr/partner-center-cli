import type { Command } from "commander";
import {
    PrivateOffersService,
    type PrivateOffer,
    type PrivateOfferListFilter,
} from "../services/private-offers-service.js";
import { JobService, type ConfigureJob } from "../services/job-service.js";

export class PrivateOfferCommandsBuilder {
    
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
                await this.pollJobUntilComplete(result);
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
                await this.pollJobUntilComplete(result);
            });
    }

    private withdrawPrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("withdraw")
            .description("Withdraw a private offer (configure state draft)")
            .argument("<id>", "private offer id")
            .action(async (id: string) => {
                const privateOffersService = new PrivateOffersService();
                const result = await privateOffersService.withdrawPrivateOffer(id);
                await this.pollJobUntilComplete(result);
            });
    }

    private async pollJobUntilComplete(result: ConfigureJob): Promise<void> {
        const jobService = new JobService();
        let job: ConfigureJob = result;
        while (job.jobStatus !== "completed") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            job = await jobService.getJobStatus(job.jobId);
            console.log(JSON.stringify(job, null, 2));
        }
        console.log(`Job completed: ${job.jobResult ?? job.jobStatus}`);
    }
}
