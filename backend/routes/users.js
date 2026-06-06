const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subject = require('../models/Subject');

// @route   POST /api/users/register
// @desc    Register and return JWT
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ username, email, password });

        // Hash the password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        // Create token payload
        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   POST /api/users/login
// @desc    Authenticate user & return JWT
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

        // Generate token
        const payload = { userId: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});
// @route   GET /api/users/search
// @desc    Search for users by username keyword
router.get('/search', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.json([]);

        // Find users whose name contains the search query (case-insensitive)
        const users = await User.find({ 
            username: { $regex: username, $options: 'i' } 
        }).select('username email'); // Only return username and email, skip the password!

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/users/:userId/friends
// @desc    Get the profiles of all friends for a user
router.get('/:userId/friends', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('friends', 'username');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

router.post('/:userId/add-friend', async (req, res) => {
    try {
        const { friendId } = req.body;
        
        // 1. Double check that the active user actually exists
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'Active user session not found.' });
        }

        // 2. Prevent adding yourself by accident
        if (req.params.userId === friendId) {
            return res.status(400).json({ message: 'You cannot add yourself as a friend.' });
        }

        // 3. Safe Type Comparison: Convert MongoDB ObjectIds to Strings before checking
        const isAlreadyFriend = user.friends.some(id => id.toString() === friendId);

        if (!isAlreadyFriend) {
            user.friends.push(friendId);
            await user.save();
            res.json({ message: 'Friend added successfully!', friends: user.friends });
        } else {
            res.status(400).json({ message: 'You are already study partners with this user!' });
        }
    } catch (error) {
        console.error("Error in add-friend route:", error.message);
        res.status(500).json({ message: 'Backend failed to link users', error: error.message });
    }
});
router.get('/:userId/recommendations', async (req, res) => {
    try {
        const currentUserId = req.params.userId;
        const user = await User.findById(currentUserId);
        if (!user) return res.status(404).json({ message: 'User not found' });


        // 1. Fetch all subjects belonging to your friends
        const friendsSubjects = await Subject.find({ owner: { $in: user.friends } }).populate('owner', 'username');
        
        
        // 2. Fetch all subjects belonging to you (to see what tasks you already have)
        const mySubjects = await Subject.find({ owner: currentUserId });

       
        // Collect all your own task titles to prevent duplicate suggestions
        const myTaskTitles = new Set();
        mySubjects.forEach(subj => {
            subj.tasks.forEach(task => myTaskTitles.add(task.title.toLowerCase().trim()));
        });

        // 3. Loop through friends' tasks and find completed ones you haven't done
        let recommendations = [];
        friendsSubjects.forEach(subj => {

            

            subj.tasks.forEach(task => {

                
                const normalizedTitle = task.title.toLowerCase().trim();
                
                if (task.isCompleted && !myTaskTitles.has(normalizedTitle)) {
                    recommendations.push({
                        title: task.title,
                        suggestedBy: subj.owner.username,
                        subjectName: subj.name
                    });
                }
            });
        });

        
        // Limit to top 5 unique recommendations so the user isn't overwhelmed
        const uniqueRecs = [];
        const seenRecs = new Set();
        for (const rec of recommendations) {
            if (!seenRecs.has(rec.title.toLowerCase())) {
                seenRecs.add(rec.title.toLowerCase());
                uniqueRecs.push(rec);
            }
            if (uniqueRecs.length >= 5) break;
        }

        res.json(uniqueRecs);
    } catch (error) {
        res.status(500).json({ message: 'Recommendation failed', error: error.message });
    }
});

// @route   GET /api/users/:userId/profile
// @desc    Get user profile details, including subjects and tasks
router.get('/:userId/profile', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        const subjects = await Subject.find({ owner: req.params.userId });
        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                friendsCount: user.friends.length
            },
            subjects
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

// @route   GET /api/users/:userId/feed
// @desc    Get recent task completion feed from friends
router.get('/:userId/feed', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Fetch subjects belonging to friends
        const friendsSubjects = await Subject.find({ owner: { $in: user.friends } }).populate('owner', 'username');
        
        let feed = [];
        friendsSubjects.forEach(subj => {
            subj.tasks.forEach(task => {
                if (task.isCompleted) {
                    feed.push({
                        friendId: subj.owner._id,
                        friendName: subj.owner.username,
                        taskTitle: task.title,
                        subjectName: subj.name,
                        completedAt: task.completedAt || new Date()
                    });
                }
            });
        });

        // Sort by completedAt descending
        feed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        
        // Return top 15 events
        res.json(feed.slice(0, 15));
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
});

module.exports = router;