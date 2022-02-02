const mongoose = require("mongoose");
const { nftCollection, block, nft } = require("./models");
const { LCDClient, Tx } = require("@terra-money/terra.js");
const { SHA256 } = require("jscrypto/SHA256");
const { Base64 } = require("jscrypto/Base64");
const { environment } = require("./config/config");
const env = process.env.NODE_ENV || "development";

const hashToHex = (data) => {
  return SHA256.hash(Base64.parse(data)).toString().toUpperCase();
};

const serial = funcs =>
    funcs.reduce((promise, func) =>
        promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]))

const getLCD = async () => {
  return new LCDClient({
    URL: environment[env].lcd,
    chainID: "columbus-5",
  });
};

module.exports = async function (job) {
  console.log(`processing block: ${job.data.block}`);

  try {
    await mongoose.connect(environment[env].dbString);
  } catch (e) {
    console.log(e);
    throw e;
  }

  if (await block.exists({ height: job.data.block })) {
    console.log("discarding");
    return job.discard();
  }

  const lcd = await getLCD();

  const existingNFTs = await nftCollection.find().distinct("address");

  const blockData = await lcd.tendermint.blockInfo(job.data.block);

  const { txs } = blockData.block.data;
  const txhashes = txs.map((txdata) => hashToHex(txdata));
  const unpackedTX = blockData.block.data.txs.map((tx) => {
    return Tx.unpackAny({ value: Buffer.from(tx, "base64") });
  });

  const messages = unpackedTX.map((tx) => tx.body.messages);
  const initMessages = [];
  const execMessages = [];

  for (let x in messages) {
    const messageList = messages[x];
    for (let message of messageList) {
      if (message.constructor.name === "MsgInstantiateContract") {
        initMessages.push(txhashes[x]);
      } else if (
        message.constructor.name === "MsgExecuteContract" &&
        (typeof message.execute_msg.create_collection !== "undefined" ||
          typeof message.execute_msg.mint_nft !== "undefined" ||
          existingNFTs.includes(message.contract))
      ) {
        execMessages.push(txhashes[x]);
      }
    }
  }

  const newBlock = new block({ height: Number(job.data.block) });

  if (initMessages.length === 0 && execMessages.length === 0) {
    return newBlock.save();
  }

  const allHashes = [...initMessages, ...execMessages];
  const uniqueHashes = [...new Set(allHashes)];
  console.log(`total tx found: ${uniqueHashes.length}`);
  const txInfos = await serial(
    uniqueHashes.map((txhash) => () => {
      console.log(`processing tx: ${txhash}`);
      return lcd.tx.txInfo(txhash)
    })
  );

  console.log(`txInfos fetched`);

  const newContracts = txInfos.map((item) => {
    return item.logs.map((log) => {
      const contracts = [];
      log.events.forEach(async (event) => {
        if (event.type === "instantiate_contract") {
          contracts.push(event);
        } else {
          if (event.type === "wasm") {
            const { value: contractAddress } = event.attributes.find(
              (item) => item.key === "contract_address"
            );

            const { value: action } = event.attributes.find(
              (item) => item.key === "action"
            );
            if (
              ["mint", "mint_nft", "transfer_nft", "send_nft"].includes(action)
            ) {
              const tokens = [];

              event.attributes.forEach((item) => {
                if (item.key === "token_id") {
                  tokens.push(item.value);
                }
              });
              for (let tokenID of tokens) {
                const nftInfo = await lcd.wasm.contractQuery(contractAddress, {
                  nft_info: {
                    token_id: tokenID,
                  },
                });
                const ownerOf = await lcd.wasm.contractQuery(contractAddress, {
                  owner_of: {
                    token_id: tokenID,
                  },
                });

                let newNFT;
                if (typeof nftInfo.extension !== "undefined") {
                  newNFT = {
                    name: nftInfo.extension?.name,
                    token_id: tokenID,
                    token_uri: nftInfo.token_uri,
                    image_url: nftInfo.extension?.image,
                    description: nftInfo.extension?.description,
                    external_url: nftInfo.extension?.external_url,
                    owner: ownerOf.owner,
                    address: contractAddress,
                  };
                } else {
                  newNFT = {
                    name: nftInfo.name,
                    token_id: tokenID,
                    image_url: nftInfo.image,
                    description: nftInfo.description,
                    owner: ownerOf.owner,
                    address: contractAddress,
                  };
                }

                const update = await nft.findOneAndUpdate(
                  { address: contractAddress, token_id: tokenID },
                  newNFT,
                  { upsert: true }
                );
                console.log(update);
              }
            }
          }
        }
      });

      return contracts;
    });
  });

  const contracts = newContracts
    .flat()
    .filter((item) => {
      return item.length !== 0;
    })
    .flat();

  contracts.forEach(async (item) => {
    const contract = {};

    item.attributes.forEach((entry) => {
      if (entry.key === "creator") {
        contract.creator = entry.value;
      } else if (entry.key === "code_id") {
        contract.codeID = entry.value;
      } else if (entry.key === "contract_address") {
        contract.address = entry.value;
      }
    });

    try {
      // Test to see if the nft_info interface exists.
      try {
        await lcd.wasm.contractQuery(contract.address, {
          nft_info: {
            token_id: "1",
          },
        });
      } finally {
        // No nft_info, lets try metadata_u_r_i which Talis uses.
        await lcd.wasm.contractQuery(contract.address, {
          metadata_u_r_i: {
            token_id: "1",
          },
        });
      }
    } catch (e) {
      if (e.response.data.message.includes("unknown variant `metadata_u_r_i")) {
        return;
      }
    }
    try {
      const contractInfo = await lcd.wasm.contractInfo(contract.address);
      contract.name = contractInfo.init_msg.name;
      contract.symbol = contractInfo.init_msg.symbol;
      if (contractInfo.init_msg.minter) {
        contract.minter = contractInfo.init_msg.minter;
      }
    } catch (e) {
      return;
    }

    try {
      const nftContract = new nftCollection(contract);
      await nftContract.save();
      console.log(`contract inserted: ${contract.address}`);
    } catch (e) {
      // NOOP
    }
  });

  return newBlock.save();
};
