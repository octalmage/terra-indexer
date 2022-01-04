const mongoose = require("mongoose");

const { Schema } = mongoose;

export const nftCollectionSchema = new Schema({
  name: String,
  symbol: String,
  minter: String,
  codeID: Number,
  creator: String,
  address: { type: String, unique: true },
  nfts: { 
    type: Schema.Types.ObjectId,
    ref: 'NFT',
  },
});