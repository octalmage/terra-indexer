"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftSchema = void 0;
const { Schema } = require('mongoose');
exports.nftSchema = new Schema({
    name: String,
    token_id: String,
    token_uri: String,
    image_url: String,
    description: String,
    external_url: String,
    owner: String,
    address: String,
});
