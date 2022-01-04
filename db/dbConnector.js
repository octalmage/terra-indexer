const mongoose = require('mongoose');
const { environment } = require('../config/config');
const { nftSchema } = require('./schema/nftSchema.js');
const { nftCollectionSchema } = require('./schema/nftCollectionSchema.js');
const { blockSchema } = require('./schema/blockSchema.js');
const env = process.env.NODE_ENV || "development";

/**
 * Mongoose Connection
**/

mongoose.connect(environment[env].dbString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

let db = mongoose.connection;
db.on('error', () => {
    console.error("Error while connecting to DB");
});

const NFTs = mongoose.model('NFT', nftSchema);
const NFTCollections = mongoose.model('Collection', nftCollectionSchema);
const Blocks = mongoose.model('Block', blockSchema);

export { NFTs, NFTCollections, Blocks };