const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    owner: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
    },
    isShared: {
        type: Boolean,
        default: false
    },
    collaborators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Nesting the tasks directly inside the subject
    tasks: [{
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    // An array to hold text, markdown, or links for tips
    tips: [{
        content: { type: String, required: true },
        addedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);