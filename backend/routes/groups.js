const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Group = require('../models/Group');
const User = require('../models/User');
const Subject = require('../models/Subject');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Link preview parser utility
async function getLinkPreview(url) {
  try {
    // If it's a YouTube link, extract video ID and use its official thumbnail
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      return {
        title: 'YouTube Video',
        description: 'Watch this shared YouTube video.',
        image: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        siteName: 'YouTube'
      };
    }

    // Default headers to mimic a browser
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36'
      },
      timeout: 5000
    });

    const html = response.data;
    
    // Scrape Title
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || 
                         html.match(/<meta[^>]+content=["']([^"']+)["']/i)?.input?.match(/property=["']og:title["']/i) ? html.match(/<meta[^>]+content=["']([^"']+)["']/i) : null;
    if (ogTitleMatch) title = ogTitleMatch[1].trim();

    // Scrape Description
    let description = '';
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    if (descMatch) description = descMatch[1].trim();

    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    if (ogDescMatch) description = ogDescMatch[1].trim();

    // Scrape Image
    let image = '';
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogImageMatch) image = ogImageMatch[1].trim();

    // Scrape Site Name
    let siteName = '';
    const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
    if (ogSiteMatch) siteName = ogSiteMatch[1].trim();

    if (!siteName) {
      try {
        const parsedUrl = new URL(url);
        siteName = parsedUrl.hostname.replace('www.', '');
      } catch (e) {}
    }

    return {
      title: title || 'Resource Link',
      description: description || 'Shared link resource.',
      image: image || '',
      siteName: siteName || 'Website'
    };
  } catch (error) {
    console.error('Error fetching preview for URL:', url, error.message);
    let siteName = 'Website';
    try {
      const parsedUrl = new URL(url);
      siteName = parsedUrl.hostname.replace('www.', '');
    } catch (e) {}
    return {
      title: 'Resource Link',
      description: 'Shared URL.',
      image: '',
      siteName: siteName
    };
  }
}

// @route   GET /api/groups/user/:userId
// @desc    Get all groups the user is part of
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const groups = await Group.find({
      $or: [
        { creator: userId },
        { members: userId }
      ]
    })
    .populate('creator', 'username email')
    .populate('members', 'username email')
    .populate('admins', 'username email')
    .populate('project', 'name')
    .populate('resources.uploadedBy', 'username')
    .sort({ updatedAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving groups', error: error.message });
  }
});

// @route   GET /api/groups/:id
// @desc    Get details of a single group
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group details', error: error.message });
  }
});

// @route   POST /api/groups
// @desc    Create a new group
router.post('/', async (req, res) => {
  try {
    const { name, description, projectId, creatorId } = req.body;
    if (!name || !creatorId) {
      return res.status(400).json({ message: 'Name and creatorId are required' });
    }

    const group = new Group({
      name,
      description,
      project: projectId || undefined,
      creator: creatorId,
      members: [creatorId],
      admins: [creatorId]
    });

    await group.save();
    
    const populatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name');

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
});

// @route   PUT /api/groups/:id
// @desc    Update group name, description or settings
router.put('/:id', async (req, res) => {
  try {
    const { name, description, settings, userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Permission check: if editing settings/info, who is allowed?
    const isAdmin = group.admins.some(adminId => adminId.toString() === userId);
    const isCreator = group.creator.toString() === userId;
    
    // Check setting constraints
    if (group.settings.whoCanEditInfo === 'admins' && !isAdmin && !isCreator) {
      return res.status(403).json({ message: 'Only admins can modify this group\'s information.' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (settings) {
      if (settings.whoCanAddResources) group.settings.whoCanAddResources = settings.whoCanAddResources;
      if (settings.whoCanEditInfo) group.settings.whoCanEditInfo = settings.whoCanEditInfo;
    }

    await group.save();
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error updating group details', error: error.message });
  }
});

// @route   POST /api/groups/:id/members
// @desc    Add member to group
router.post('/:id/members', async (req, res) => {
  try {
    const { username, adminUserId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Caller must be an admin
    const isCallerAdmin = group.admins.some(adminId => adminId.toString() === adminUserId);
    if (!isCallerAdmin) {
      return res.status(403).json({ message: 'Only admins can add members to this group.' });
    }

    // Find the user to add
    const userToAdd = await User.findOne({ username });
    if (!userToAdd) return res.status(404).json({ message: `User "${username}" not found.` });

    // Check if already in group
    const isAlreadyMember = group.members.some(mId => mId.toString() === userToAdd._id.toString());
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this group.' });
    }

    group.members.push(userToAdd._id);
    await group.save();

    // Create Notification
    try {
      const Notification = require('../models/Notification');
      const notification = new Notification({
        recipient: userToAdd._id,
        sender: adminUserId,
        type: 'group_invite',
        content: `You were added to the group "${group.name}"`
      });
      await notification.save();

      const io = req.app.get('socketio');
      const activeUsers = req.app.get('activeUsers');
      if (io && activeUsers) {
        const socketId = activeUsers[userToAdd._id.toString()];
        if (socketId) {
          const populatedNotif = await notification.populate('sender', 'username');
          io.to(socketId).emit('new_notification', populatedNotif);
        }
      }
    } catch (err) {
      console.error('Group add notification fail:', err.message);
    }

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error adding member', error: error.message });
  }
});

// @route   DELETE /api/groups/:id/members/:targetUserId
// @desc    Remove member from group (or leave)
router.delete('/:id/members/:targetUserId', async (req, res) => {
  try {
    const { requestUserId } = req.query; // Who is performing the delete request
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const targetUserId = req.params.targetUserId;
    const isLeavingSelf = requestUserId === targetUserId;
    const isRequestAdmin = group.admins.some(adminId => adminId.toString() === requestUserId);
    const isTargetCreator = group.creator.toString() === targetUserId;

    // Creator cannot leave or be removed
    if (isTargetCreator) {
      return res.status(400).json({ message: 'The creator cannot leave the group. You must delete the group instead.' });
    }

    // Permission check
    if (!isLeavingSelf && !isRequestAdmin) {
      return res.status(403).json({ message: 'Only admins can remove members from the group.' });
    }

    // Remove from members and admins
    group.members = group.members.filter(mId => mId.toString() !== targetUserId);
    group.admins = group.admins.filter(aId => aId.toString() !== targetUserId);

    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error removing member', error: error.message });
  }
});

// @route   PUT /api/groups/:id/admins
// @desc    Promote or Demote member admin status
router.put('/:id/admins', async (req, res) => {
  try {
    const { targetUserId, action, requestUserId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Requesting user must be an admin
    const isRequestAdmin = group.admins.some(adminId => adminId.toString() === requestUserId);
    if (!isRequestAdmin) {
      return res.status(403).json({ message: 'Only admins can manage roles in this group.' });
    }

    const isTargetCreator = group.creator.toString() === targetUserId;

    if (action === 'promote') {
      const isAlreadyAdmin = group.admins.some(aId => aId.toString() === targetUserId);
      if (!isAlreadyAdmin) {
        group.admins.push(targetUserId);
      }
    } else if (action === 'demote') {
      if (isTargetCreator) {
        return res.status(400).json({ message: 'The group creator cannot be demoted.' });
      }
      group.admins = group.admins.filter(aId => aId.toString() !== targetUserId);
    } else {
      return res.status(400).json({ message: 'Invalid action. Must be promote or demote.' });
    }

    await group.save();
    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error updating admin status', error: error.message });
  }
});

// @route   POST /api/groups/:id/resources
// @desc    Add resource link or YouTube video
router.post('/:id/resources', async (req, res) => {
  try {
    const { title, type, url, notes, userId } = req.body;
    if (!title || !type || !url || !userId) {
      return res.status(400).json({ message: 'Title, type, url, and userId are required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Permission check
    const isMember = group.members.some(mId => mId.toString() === userId);
    const isAdmin = group.admins.some(aId => aId.toString() === userId);
    
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }

    if (group.settings.whoCanAddResources === 'admins' && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can add resources to this group.' });
    }

    // Scrape preview if it's a url link
    let preview = { title: '', description: '', image: '', siteName: '' };
    if (type === 'link' || type === 'youtube') {
      preview = await getLinkPreview(url);
    }

    group.resources.push({
      title,
      type,
      url,
      notes,
      previewData: preview,
      uploadedBy: userId
    });

    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.status(201).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error adding resource', error: error.message });
  }
});

// @route   POST /api/groups/:id/resources/upload-pdf
// @desc    Upload PDF using base64 data
router.post('/:id/resources/upload-pdf', async (req, res) => {
  try {
    const { title, notes, fileName, base64Data, userId } = req.body;
    if (!title || !fileName || !base64Data || !userId) {
      return res.status(400).json({ message: 'Title, fileName, base64Data, and userId are required' });
    }

    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Permission Check
    const isMember = group.members.some(mId => mId.toString() === userId);
    const isAdmin = group.admins.some(aId => aId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group.' });
    }
    if (group.settings.whoCanAddResources === 'admins' && !isAdmin) {
      return res.status(403).json({ message: 'Only admins can add resources to this group.' });
    }

    // Process Base64
    // format: data:application/pdf;base64,JVBERi0xLjQK...
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid base64 document format' });
    }

    const fileBuffer = Buffer.from(matches[2], 'base64');
    
    // Generate unique name
    const sanitizedFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const filePath = path.join(uploadsDir, sanitizedFileName);

    // Save file
    fs.writeFileSync(filePath, fileBuffer);

    // Create resource with local URL relative to base URL
    const fileUrl = `/uploads/${sanitizedFileName}`;

    group.resources.push({
      title,
      type: 'pdf',
      url: fileUrl,
      notes,
      uploadedBy: userId,
      previewData: {
        title: fileName,
        description: 'PDF Document shared within the group.',
        image: '', // PDF generic
        siteName: 'Local Drive PDF'
      }
    });

    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.status(201).json(updatedGroup);
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ message: 'Error uploading PDF file', error: error.message });
  }
});

// @route   DELETE /api/groups/:id/resources/:resourceId
// @desc    Delete a resource
router.delete('/:id/resources/:resourceId', async (req, res) => {
  try {
    const { userId } = req.query;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const resource = group.resources.id(req.params.resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    // Caller must be an admin OR the uploader
    const isAdmin = group.admins.some(aId => aId.toString() === userId);
    const isUploader = resource.uploadedBy.toString() === userId;

    if (!isAdmin && !isUploader) {
      return res.status(403).json({ message: 'You do not have permission to delete this resource.' });
    }

    // If resource is local PDF, remove file from disk
    if (resource.type === 'pdf' && resource.url.startsWith('/uploads/')) {
      try {
        const fileName = resource.url.replace('/uploads/', '');
        const filePath = path.join(uploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Failed to delete physical PDF file:', err.message);
      }
    }

    // Remove using Mongoose document Array method
    group.resources.pull({ _id: req.params.resourceId });
    await group.save();

    const updatedGroup = await Group.findById(group._id)
      .populate('creator', 'username email')
      .populate('members', 'username email')
      .populate('admins', 'username email')
      .populate('project', 'name')
      .populate('resources.uploadedBy', 'username');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting resource', error: error.message });
  }
});

// @route   DELETE /api/groups/:id
// @desc    Delete entire group
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.query;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Only creator can delete
    if (group.creator.toString() !== userId) {
      return res.status(403).json({ message: 'Only the group creator can delete this group.' });
    }

    // Clean up all local PDF resources from disk
    group.resources.forEach(resource => {
      if (resource.type === 'pdf' && resource.url.startsWith('/uploads/')) {
        try {
          const fileName = resource.url.replace('/uploads/', '');
          const filePath = path.join(uploadsDir, fileName);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {}
      }
    });

    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group', error: error.message });
  }
});

module.exports = router;
