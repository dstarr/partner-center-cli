import type { Command } from "commander";
import { JobService } from "../services/job-service.js";

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
            .action(async (id: string) => {
                const jobService = new JobService();
                const job = await jobService.getJobStatus(id);
                console.error(`Job ${job.jobId}: ${job.jobStatus} (${job.jobResult})`);
                console.log(JSON.stringify(job, null, 2));
            });
    }
}
