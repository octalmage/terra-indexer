#!/usr/bin/env node
const WebSocketClient = require("websocket").client;
const mongoose = require("mongoose");
const path = require("path");
const { block } = require("./models");
const Arena = require("bull-arena");
const Bull = require("bull");
const Queue = require("bull");
const { environment } = require("./config/config");

const env = process.env.NODE_ENV || "development";

Arena(
  {
    Bull,
    queues: [
      {
        type: "bull",

        // Name of the bull queue, this name must match up exactly with what you've defined in bull.
        name: "processContractInit",

        // Hostname or queue prefix, you can put whatever you want.
        hostId: "macbook",
      },
    ],
  },
  {
    // Make the arena dashboard become available at {my-site.com}/arena.
    basePath: "/arena",
  }
);

const queueSettings = {
  attempts: 10,
  backoff: { type: "exponential", delay: 30000 },
};

const contractQueue = new Queue("processContractInit", {
  limiter: {
    max: 1000000,
    duration: 60000,
    bounceBack: true,
  },
  defaultJobOptions: {
    stackTraceLimit: 500,
  }
});

const RPC_URL = environment[env].rpc;

// Taken from https://github.com/etfinder/fcd/blob/col-5-seed/columbus-5.sh#L71
const START_BLOCK = 6000000;

const client = new WebSocketClient();

const main = async () => {
  try {
    await mongoose.connect(environment[env].dbString);
  } catch (e) {
    console.log(e);
    throw e;
  }
  client.on("connectFailed", function (error) {
    console.log("Connect Error: " + error.toString());
  });

  client.on("connect", function (connection) {
    connection.sendUTF(
      `{ "jsonrpc": "2.0", "method": "subscribe", "params": ["tm.event='NewBlock'"], "id": 1 }`
    );

    console.log("WebSocket Client Connected");
    connection.on("error", function (error) {
      console.log("Connection Error: " + error.toString());
    });
    connection.on("close", function () {
      console.log("echo-protocol Connection Closed");
    });
    connection.on("message", function (message) {
      if (message.type === "utf8") {
        const data = JSON.parse(message.utf8Data);
        if (typeof data.result.data !== "undefined") {
          console.log(
            `queue block: ${data.result.data.value.block.header.height}`
          );
          contractQueue.add(
            {
              block: data.result.data.value.block.header.height,
            },
            { ...queueSettings, priority: 1 }
          );
        }
      }
    });
  });

  client.connect(`${RPC_URL}/websocket`);

  contractQueue.process(8, path.join(__dirname, "processor.js"));

  // Wait for at least 1 block.
  await new Promise((resolve) => setTimeout(resolve, 10000));

  
  const max = 6324635;

  let checkBlock = START_BLOCK;
  let exists = await block.exists({ height: checkBlock });
  while (exists) {
    console.log(`already indexed: ${checkBlock}`);
    checkBlock += 1000;
    exists = await block.exists({ height: checkBlock });
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  checkBlock -= 1000;
  
  let synced = checkBlock >= max;

  while (!synced) {
    contractQueue.add(
      {
        block: checkBlock,
      },
      {
        ...queueSettings,
        priority: 2,
      }
    );
    checkBlock++;

    if (checkBlock >= max) {
      synced = true;
    }

    const delayedCount = await contractQueue.getDelayedCount();
    const waitingCount = await contractQueue.getWaitingCount();

    if (delayedCount >= 100 || waitingCount >= 100) {
      console.log("sleeping for a minute, queue backed up");
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

main();
