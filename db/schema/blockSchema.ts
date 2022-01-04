const mongoose = require("mongoose");

const { Schema } = mongoose;

export const blockSchema = new Schema({
  height: { type: Number, unique: true },
  dateProcessed: { type: Date, default: Date.now },
});

