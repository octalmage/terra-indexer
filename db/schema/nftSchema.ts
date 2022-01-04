const { Schema } = require('mongoose');

export const nftSchema = new Schema({
    name: String,
    token_id: String,
    token_uri: String,
    image_url: String,
    description: String,
    external_url: String,
    owner: String,
    address: String,
  });
  
 