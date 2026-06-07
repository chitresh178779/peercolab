const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');

// @route   POST /api/subjects
// @desc    Create a new subject for a user
router.post('/', async (req, res) => {
    try {
        const { name, ownerId } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Subject name is required' });
        }
        if (!ownerId) {
            return res.status(400).json({ message: 'Owner ID is required' });
        }

        // Case-insensitive duplicate check for the same owner
        const escapedName = name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const existingSubject = await Subject.findOne({
            owner: ownerId,
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
        });

        if (existingSubject) {
            return res.status(400).json({ message: `A subject named "${name.trim()}" already exists.` });
        }
        
        const newSubject = new Subject({
            name: name.trim(),
            owner: ownerId
        });

        const savedSubject = await newSubject.save();
        const populated = await Subject.findById(savedSubject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');
        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   DELETE /api/subjects/:subjectId
// @desc    Delete a specific subject
router.delete('/:subjectId', async (req, res) => {
    try {
        const subject = await Subject.findByIdAndDelete(req.params.subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        res.json({ message: 'Subject deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   POST /api/subjects/:subjectId/tasks
// @desc    Add a task to a specific subject
router.post('/:subjectId/tasks', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Task title is required' });
        }

        const subject = await Subject.findById(req.params.subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        // Case-insensitive duplicate check for tasks within this subject
        const taskExists = subject.tasks.some(task => 
            task.title.trim().toLowerCase() === title.trim().toLowerCase()
        );

        if (taskExists) {
            return res.status(400).json({ message: `A task with title "${title.trim()}" already exists in this subject.` });
        }

        // Push the new task into the subject's tasks array
        subject.tasks.push({ title: title.trim() });
        await subject.save();

        const populated = await Subject.findById(subject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');
        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   DELETE /api/subjects/:subjectId/tasks/:taskId
// @desc    Delete a specific task from a subject
router.delete('/:subjectId/tasks/:taskId', async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        // Remove the task from subdocument array
        subject.tasks.pull({ _id: req.params.taskId });
        await subject.save();

        const populated = await Subject.findById(subject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');
        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   PUT /api/subjects/:subjectId/tasks/:taskId
// @desc    Mark a task as completed
router.put('/:subjectId/tasks/:taskId', async (req, res) => {
    try {
        const subject = await Subject.findById(req.params.subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        // Find the specific task inside the array
        const task = subject.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Update task status and timestamp
        task.isCompleted = true;
        task.completedAt = Date.now();

        await subject.save();
        res.json({ message: 'Task completed!', task });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/subjects/user/:userId
// @desc    Get all subjects (owned and shared) for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const subjects = await Subject.find({
            $or: [
                { owner: req.params.userId },
                { collaborators: req.params.userId }
            ]
        })
        .populate('owner', 'username')
        .populate('collaborators', 'username')
        .populate('tasks.assignedTo', 'username');
        
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   POST /api/subjects/:subjectId/tips
// @desc    Add a tip or trick to a subject
router.post('/:subjectId/tips', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Tip content is required' });
        }

        const subject = await Subject.findById(req.params.subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        subject.tips.push({ content: content.trim() });
        await subject.save();
        
        const populated = await Subject.findById(subject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   POST /api/subjects/:subjectId/share
// @desc    Share a subject workspace with a user (by username)
router.post('/:subjectId/share', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || !username.trim()) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const User = require('../models/User');
        const Notification = require('../models/Notification');

        const subject = await Subject.findById(req.params.subjectId).populate('owner', 'username');
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const targetUser = await User.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, 'i') } });
        if (!targetUser) return res.status(404).json({ message: 'User not found' });

        if (subject.owner._id.toString() === targetUser._id.toString()) {
            return res.status(400).json({ message: 'You already own this subject!' });
        }

        const isCollaborator = subject.collaborators.some(cId => cId.toString() === targetUser._id.toString());
        if (isCollaborator) {
            return res.status(400).json({ message: 'User is already a collaborator!' });
        }

        subject.collaborators.push(targetUser._id);
        subject.isShared = true;
        await subject.save();

        // Save persistent notification for targetUser
        const notification = new Notification({
            recipient: targetUser._id,
            sender: subject.owner._id,
            type: 'task_assigned',
            content: `${subject.owner.username} shared the subject workspace "${subject.name}" with you!`
        });
        await notification.save();

        // Real-time socket emit
        const io = req.app.get('socketio');
        const activeUsers = req.app.get('activeUsers');
        if (io && activeUsers) {
            const socketId = activeUsers[targetUser._id.toString()];
            if (socketId) {
                const populatedNotif = await notification.populate('sender', 'username');
                io.to(socketId).emit('new_notification', populatedNotif);
            }
        }

        const updatedSubject = await Subject.findById(subject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');

        res.json(updatedSubject);
    } catch (error) {
        res.status(500).json({ message: 'Server Error sharing subject', error: error.message });
    }
});

// @route   PUT /api/subjects/:subjectId/tasks/:taskId/assign
// @desc    Assign a task to a collaborator
router.put('/:subjectId/tasks/:taskId/assign', async (req, res) => {
    try {
        const { userId } = req.body; // Can be null to unassign
        const subject = await Subject.findById(req.params.subjectId).populate('owner', 'username');
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const task = subject.tasks.id(req.params.taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.assignedTo = userId || undefined;
        await subject.save();

        // Create notification if assigned to another user
        if (userId && userId.toString() !== subject.owner._id.toString()) {
            const Notification = require('../models/Notification');
            const notification = new Notification({
                recipient: userId,
                sender: subject.owner._id,
                type: 'task_assigned',
                content: `${subject.owner.username} assigned you the task "${task.title}" in "${subject.name}"`
            });
            await notification.save();

            const io = req.app.get('socketio');
            const activeUsers = req.app.get('activeUsers');
            if (io && activeUsers) {
                const socketId = activeUsers[userId.toString()];
                if (socketId) {
                    const populatedNotif = await notification.populate('sender', 'username');
                    io.to(socketId).emit('new_notification', populatedNotif);
                }
            }
        }

        const updatedSubject = await Subject.findById(subject._id)
            .populate('owner', 'username')
            .populate('collaborators', 'username')
            .populate('tasks.assignedTo', 'username');

        res.json(updatedSubject);
    } catch (error) {
        res.status(500).json({ message: 'Server Error assigning task', error: error.message });
    }
});

module.exports = router;