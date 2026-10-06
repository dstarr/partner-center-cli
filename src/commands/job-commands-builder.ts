import type { Command } from "commander";
import { JobService } from "../services/job-service.js";
import { globalsFrom, type GlobalOptions } from "./options.js";

export class JobCommandsBuilder {

    public addJobCommands(program: Command): void {
        const jobsCommand = program
            .command("jobs")
            .description("Work with Product Ingestion configure jobs through the JobService");

        this.addGetJobCommand(jobsCommand);
    }

    private addGetJobCommand(jobsCommand: Command): void {
        jobsCommand.command("get")
            .description("Get the status of a job by its id")
            .argument("<id>", "job id returned by a configure request")
            .action(async (id: string, _options: unknown, command: Command) => {
                const globals = globalsFrom(command) as GlobalOptions;
                const jobService = new JobService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                const job = await jobService.getJobStatus(id);
                console.error(`Job ${job.jobId}: ${job.jobStatus} (${job.jobResult})`);
                console.log(JSON.stringify(job, null, 2));
            });
    }
}
