const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        default: 0
    },
    completed: {
        type: Boolean,
        default: false
    },
    system: {
        type: String,
        default: 'custom'
    },
    completedAt: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Task', taskSchema);
