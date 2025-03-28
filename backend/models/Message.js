const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    encryptedMessage: String,
});

module.exports = mongoose.model('Message', MessageSchema);
