import type { Command } from "commander";
import { PrivateOffersService, type PrivateOffer } from "../services/private-offers-service.js";
import { globalsFrom, type GlobalOptions } from "./options.js";
import { PrivateOfferSchemas } from "../services/private-offers-service.js";
import { JobService, type ConfigureJob } from "../services/job-service.js";
import { PrivateOfferFactory } from "../services/private-offer-configuration-factory.js";

export class PrivateOfferCommandsBuilder {
    
    public addPrivateOfferCommands(program: Command): void {
        const privateOffersCommand = program
            .command("private-offers")
            .description("Work with private offers through the PrivateOffersService");

        
        this.addCreatePrivateOfferCommand(privateOffersCommand);
        this.addDeletePrivateOfferCommand(privateOffersCommand);
        this.addGetPrivateOfferCommand(privateOffersCommand);
        this.addListPrivateOffersCommand(privateOffersCommand);
    }
    
    private addCreatePrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("create")
            .description("Create a new private offer")
            .argument("<name>", "name of the private offer")
            .action(async (name: string, _options: unknown, command: Command) => {
                
                const globals: GlobalOptions = globalsFrom(command);
                
                const privateOffersService: PrivateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });

                const result: ConfigureJob = await privateOffersService.createPrivateOffer(name);
                
                // poll for the job to complete
                const jobService: JobService = new JobService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                
                let job: ConfigureJob = result;
                while (job.jobStatus !== "completed") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    job = await jobService.getJobStatus(job.jobId);
                    console.log(JSON.stringify(job, null, 2));
                }
                console.log(`Job completed: ${job.jobStatus}`);
            });
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
                const privateOffer = await privateOffersService.getPrivateOffer(id) as PrivateOffer;
                console.error(`Private offer: ${privateOffer.id}`);
                console.log(JSON.stringify(privateOffer, null, 2));
            });
    }

    private addDeletePrivateOfferCommand(privateOffersCommand: Command): void {
        privateOffersCommand.command("delete")
            .description("Delete a private offer")
            .argument("<id>", "private offer id")
            .action(async (id: string, _options: unknown, command: Command) => {
                const globals = globalsFrom(command) as GlobalOptions;
                const privateOffersService = new PrivateOffersService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                
                const privateOffer = await privateOffersService.getPrivateOffer(id) as PrivateOffer;

                privateOffer.state = "deleted";

                const result = await privateOffersService.postPrivateOfferConfiguration({
                    $schema: PrivateOfferSchemas.Configure,
                    resources: [
                        privateOffer
                    ],
                });

                console.log(`Result job ID: ${result.jobId}`);
                

                // poll for the job to complete
                const jobService = new JobService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                let job = result;
                while (job.jobStatus !== "completed") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    job = await jobService.getJobStatus(job.jobId);
                    console.log(JSON.stringify(job, null, 2));
                }
                console.log(`Job completed: ${job.jobStatus}`);
            });
    }
}
