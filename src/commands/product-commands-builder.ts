import { Option, type Command } from "commander";
import { TARGET_TYPES, ProductsService, type TargetType } from "../services/products-service.js";
import { globalsFrom } from "./options.js";
import { ProductParser } from "../services/products-parser.js";
import { MarketplaceSchemasRegistry, type MarketplaceSchema } from "../schemas/marketplace-schemas.js";
import { JobService, type ConfigureJob } from "../services/job-service.js";

export class ProductCommandsBuilder {
    private readonly productsService: ProductsService;
    private readonly productParser: ProductParser;
    private readonly jobService: JobService;

    constructor() {
        this.productsService = new ProductsService();
        this.productParser = new ProductParser();
        this.jobService = new JobService();
    }

    public addProductCommands(program: Command): void {

        const productsCommand = program.command("products").description("Work with products through the ProductsService");

        this.addListProductsCommand(productsCommand);
        this.addGetProductCommand(productsCommand);
        this.addGetProductSchemasCommand(productsCommand);
        this.addGetProductResourceIdsCommand(productsCommand);
        this.addGetProductResourcesCommand(productsCommand);
        this.addRenameProductCommand(productsCommand);
    }
    
    private addListProductsCommand(productsCommand: Command): void {
        productsCommand.command("list")
            .description("List all products")
            .action(async () => {
                const products = await this.productsService.getAllProducts();
                console.log(JSON.stringify(products, null, 2));
            });
    }

    private addGetProductSchemasCommand(productsCommand: Command): void {
        productsCommand.command("getSchemas")
            .description("List the $schema of the product and each of its resources, one per line")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(new Option("--target-type <type>", "environment to read (default: preview)")
                .choices([...TARGET_TYPES]))
            .action(async (productId: string, options: { targetType?: TargetType; }) => {
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                const schemas = await this.productsService.getProductResourceSchemas(productId, target);
                console.log(schemas.join("\n"));
            });
    }

    private addGetProductCommand(productsCommand: Command): void {
        productsCommand
            .command("get")
            .description("Fetch one product and all of its resources")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(
                new Option("--target-type <type>", "environment to read (default: preview)")
                    .choices([...TARGET_TYPES])
            )
            .action(async (productId: string, options: { targetType?: TargetType; }) => {
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                const tree = await this.productsService.getProduct(productId, target);
                console.error(`Target: ${tree.target?.targetType}, resources: ${tree.resources?.length ?? 0}`);
                console.log(JSON.stringify(tree, null, 2));
            });
    }


    private addGetProductResourcesCommand(productsCommand: Command): void {
        productsCommand
            .command("getResources")
            .description("Print each resource in the product as one line of JSON (JSON Lines)")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(
                new Option("--target-type <type>", "environment to read (default: preview)")
                    .choices([...TARGET_TYPES])
            )
            .addOption(
                new Option("--schema <name>", "only resources that use this schema")
                    .choices([...Object.keys(MarketplaceSchemasRegistry.Schemas)])
            )
            .action(
                async (
                    productId: string,
                    options: { targetType?: TargetType; schema?: keyof typeof MarketplaceSchemasRegistry.Schemas; },
                ) => {
                    const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                    const product = await this.productsService.getProduct(productId, target);
                    const schema = options.schema !== undefined ? MarketplaceSchemasRegistry.Schemas[options.schema] : undefined;
                    for (const resource of this.productParser.getResources(product, schema)) {
                        console.log(resource);
                    }
                }
            );
    }

    private addGetProductResourceIdsCommand(productsCommand: Command): void {
        productsCommand
            .command("getResourceIds")
            .description("List the ids of the product and each of its resources, one per line")
            .argument("<productId>", "product durable id, with or without the product/ prefix")
            .addOption(new Option("--target-type <type>", "environment to read (default: preview)")
                .choices([...TARGET_TYPES]))
            .addOption(new Option("--schema <name>", "only resources that use this schema")
                .choices([...Object.keys(MarketplaceSchemasRegistry.Schemas)]))
            .action(async (productId: string, options: { targetType?: TargetType; schema?: keyof typeof MarketplaceSchemasRegistry.Schemas; }, command: Command) => {

                const globals = globalsFrom(command);
                const manager = new ProductsService({
                    ...(globals.baseUrl !== undefined ? { baseUrl: globals.baseUrl } : {}),
                    locale: globals.locale,
                });
                const target = options.targetType !== undefined ? { targetType: options.targetType } : {};
                try {
                    const product = await manager.getProduct(productId, target);
                    const schema = options.schema !== undefined ? MarketplaceSchemasRegistry.Schemas[options.schema] : undefined;
                    for (const id of new ProductParser().getResourceIds(product, schema)) {
                        console.log(id);
                    }
                } catch (error) {
                    throw error;
                }
            }
            );
    }

    private addRenameProductCommand(productsCommand: Command): void {
        productsCommand.command("rename")
            .description("Post a new alias for a product")
            .argument("<productId>", "product durable id, without the product/ prefix")
            .argument("<alias>", "new alias for the product")
            .action(async (productId: string, alias: string) => {

                const product = await this.productsService.getProduct(productId);

                // get the product resource by schema
                const productResource = product.resources.find((resource) => resource.$schema === MarketplaceSchemasRegistry.Schemas.Product);

                // check if the product resource exists
                if (!productResource) {
                    console.error(`Product resource with schema ${MarketplaceSchemasRegistry.Schemas.Product} not found`);
                    return;
                }

                // check if the product already has the alias
                if (productResource.alias === alias) {
                    console.error(`Product already has alias ${alias}`);
                    return;
                }

                // update the product resource alias
                productResource.alias = alias;

                // post the new product resource configuration
                const result = await this.productsService.postProductConfiguration({
                    $schema: MarketplaceSchemasRegistry.Schemas.Configure,
                    resources: [
                        productResource
                    ],
                });

                // poll for the job to complete
                let job = JSON.parse(result) as ConfigureJob;
                console.log(JSON.stringify(job, null, 2));
                while (job.jobStatus !== "completed") {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    job = await this.jobService.getJobStatus(job.jobId);
                    console.log(JSON.stringify(job, null, 2));
                }
                console.error(`Job completed: ${job.jobStatus}`);
            });
    }
}