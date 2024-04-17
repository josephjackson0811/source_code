const mongoose = require("mongoose")
const Schema = mongoose.Schema;

let inventorySchema = new Schema({
    name : String,
    quantity: Number,
    imageUrl: String
});
module.exports = mongoose.model('Inventory', inventorySchema); 