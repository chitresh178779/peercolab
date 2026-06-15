const mongoose = require('mongoose');

const IdeaSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  project: {
    type: String,
    default: 'General',
    trim: true
  },
  type: {
    type: String,
    default: 'Other',
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  favorite: {
    type: Boolean,
    default: false
  },
  aiExpanded: {
    problemStatement: { type: String, default: '' },
    proposedSolution: { type: String, default: '' },
    targetUsers: { type: String, default: '' },
    expectedImpact: { type: String, default: '' },
    nextSteps: [{ type: String }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Idea', IdeaSchema);
