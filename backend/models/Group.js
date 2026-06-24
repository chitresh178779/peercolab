const mongoose = require('mongoose');

const ResourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['link', 'youtube', 'pdf'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  previewData: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    siteName: { type: String, default: '' }
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  resources: [ResourceSchema],
  settings: {
    whoCanAddResources: {
      type: String,
      enum: ['all', 'admins'],
      default: 'all'
    },
    whoCanEditInfo: {
      type: String,
      enum: ['all', 'admins'],
      default: 'admins'
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Group', GroupSchema);
