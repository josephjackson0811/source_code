const mongoose = require("mongoose")
const Schema = mongoose.Schema;

let userSchema = new Schema({
    username: String,
    password: String,
    bio: String,
    user: String
});
module.exports = mongoose.model('User', userSchema); 