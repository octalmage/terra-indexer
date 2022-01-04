"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftCollectionSchema = void 0;
const mongoose = require("mongoose");
const { Schema } = mongoose;
exports.nftCollectionSchema = new Schema({
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
