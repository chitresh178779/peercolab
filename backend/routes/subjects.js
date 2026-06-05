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
        res.status(201).json(savedSubject);
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

        res.json(subject);
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

        res.json(subject);
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
// @desc    Get all subjects (and nested tasks/tips) for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        const subjects = await Subject.find({ owner: req.params.userId });
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
        
        res.status(201).json(subject);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;