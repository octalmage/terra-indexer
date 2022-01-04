const mongoose = require("mongoose");
const { nftSchema } = require('./db/schema/nftSchema');
const { blockSchema } = require('./db/schema/blockSchema');
const { nftCollectionSchema } = require('./db/schema/nftCollectionSchema');

const nftCollection = mongoose.model('Collection', nftCollectionSchema);
const nft = mongoose.model('NFT', nftSchema);
const block = mongoose.model('Block', blockSchema);

module.exports = {
  nft,
  block,
  nftCollection,
}