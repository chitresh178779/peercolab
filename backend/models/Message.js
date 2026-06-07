const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    isDeletedForEveryone: {
        type: Boolean,
        default: false
    },
    deletedForUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
