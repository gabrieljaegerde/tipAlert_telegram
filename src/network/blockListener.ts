import { ApiPromise } from "@polkadot/api";
import { botParams } from "../../config.js";
import { blockCountAdapter } from "../../tools/blockCountAdapter.js";
import { handleEvents } from "./eventsHandler.js";
import { getBlockIndexer } from "../../tools/substrateUtils.js";
import { handleExtrinsics } from "./extrinsicsHandler.js";
import { logger } from "../../tools/logger.js";

interface IStorageProvider {
    readonly storageKey: string;
    set(latestBlock: number): Promise<void>;
    get(): Promise<number>;
}

export class BlockListener {
    private apiPromise: ApiPromise;
    private initialised: boolean;
    private missingBlockFetchInitiated: boolean;
    private missingBlockEventsFetched: boolean;
    private currentBlockNumber: number;
    public storageProvider: IStorageProvider;
    constructor(
        polkadotApi: ApiPromise,
        storageProvider: IStorageProvider
    ) {
        if (!polkadotApi) {
            throw new Error(
                `"providerInterface" is missing. Please provide polkadot.js provider interface (i.e. websocket)`
            );
        }
        this.apiPromise = polkadotApi;
        this.initialised = false;
        this.missingBlockFetchInitiated = false;
        this.missingBlockEventsFetched = false;
        this.currentBlockNumber = 0;
        this.storageProvider =
            storageProvider || new blockCountAdapter(botParams.localStorage, "headerBlock");
        this.initialize();
    }

    private initialize = async () => {
        if (!this.initialised) {
            await this.initialiseListener();
            this.initialised = true;
        }
    };

    private fetchEventsAndExtrinsicsAtBlock = async (blockNumber: number): Promise<void> => {
        try {
            const blockHash = await botParams.api.rpc.chain.getBlockHash(blockNumber);
            const rawBlock = await botParams.api.rpc.chain.getBlock(blockHash);
            const blockApi = await botParams.api.at(blockHash);
            const block = rawBlock.block;
            const blockIndexer = getBlockIndexer(block);
            const events = await blockApi.query.system.events();
            await handleExtrinsics(block.extrinsics, events, blockIndexer);
            await handleEvents(events, blockIndexer, block.extrinsics);
        } catch (e) {
            logger.error(`error fetching events at block ${blockNumber}: ${e}`);
            return;
        }

    };

    private fetchMissingBlockEventsAndExtrinsics = async (latestBlockDb: number, to: number): Promise<void> => {
        try {
            for (let i = latestBlockDb + 1; i <= to; i++) {
                await this.fetchEventsAndExtrinsicsAtBlock(i);
            }
        } catch (e) {
            logger.error(`error fetching missing block ev. & extr. from ${latestBlockDb} to ${to}: ${e}`);
            return;
        }
    };

    private async initialiseListener() {
        const headSubscriber = this.apiPromise.rpc.chain.subscribeNewHeads;

        headSubscriber(async (header) => {
            const blockNumber = header.number.toNumber();
            if (blockNumber === 0) {
                console.error(
                    "Unable to retrieve finalized head - returned genesis block"
                );
            }

            if (!this.missingBlockEventsFetched && !this.missingBlockFetchInitiated) {
                this.missingBlockFetchInitiated = true;
                const latestBlock = await this.storageProvider.get();
                await this.fetchMissingBlockEventsAndExtrinsics(latestBlock, blockNumber - 1);
                this.missingBlockEventsFetched = true;
            }

            this.fetchEventsAndExtrinsicsAtBlock(blockNumber);

            // Update local db latestBlock
            if (
                this.missingBlockEventsFetched
            ) {
                try {
                    if (this.currentBlockNumber < blockNumber) this.currentBlockNumber = blockNumber;
                    await this.storageProvider.set(this.currentBlockNumber);
                } catch (e: any) {
                    console.error(e);
                }
            }
        });

        return;
    }
}