import { JobService, type ConfigureJob } from "./job-service.js";

/** Polls Product Ingestion configure jobs until they complete. */
export class ConfigureJobPoller {
  public constructor(private readonly jobService: JobService = new JobService()) {}

  public async pollUntilComplete(initial: ConfigureJob): Promise<ConfigureJob> {
    let job = initial;
    this.printJob(job);
    while (job.jobStatus !== "completed") {
      await this.wait();
      job = await this.jobService.getJobStatus(job.jobId);
      this.printJob(job);
    }
    console.log(`Job completed: ${job.jobResult ?? job.jobStatus}`);
    return job;
  }

  private printJob(job: ConfigureJob): void {
    console.log(JSON.stringify(job, null, 2));
  }

  private wait(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
