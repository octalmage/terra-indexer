"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockSchema = void 0;
const mongoose = require("mongoose");
const { Schema } = mongoose;
exports.blockSchema = new Schema({
    height: { type: Number, unique: true },
    dateProcessed: { type: Date, default: Date.now },
});
