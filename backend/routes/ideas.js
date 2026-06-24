const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Heuristic fallback for metadata extraction
function extractHeuristics(content) {
  const cleanContent = content.trim();
  const firstSentence = cleanContent.split(/[.!?]/)[0].trim();
  const words = firstSentence.split(/\s+/);
  
  let title = "";
  if (words.length <= 6) {
    title = firstSentence;
  } else {
    title = words.slice(0, 5).join(" ");
  }
  
  // Clean up title
  title = title.replace(/^(PeerColab should|StudySync should|I want to|Idea to|We should|How about we|Create a|Build a|Make a)\s+/i, '');
  title = title.charAt(0).toUpperCase() + title.slice(1);
  if (title.length > 50) {
    title = title.substring(0, 47) + "...";
  }
  if (!title) {
    title = "New Idea Insight";
  }

  // Project detection
  let project = "General";
  if (/peercolab/i.test(content)) project = "PeerColab";
  else if (/studysync/i.test(content)) project = "StudySync";
  else if (/taskflow/i.test(content)) project = "TaskFlow";

  // Type categorization
  let type = "Feature";
  if (/(bug|fix|broken|error|refactor|database|api|server|backend|frontend|technical)/i.test(content)) {
    type = "Technical";
  } else if (/(startup|business|monetize|market|sell|product|company)/i.test(content)) {
    type = "Startup Idea";
  } else if (/(strategy|roadmap|milestone|plan)/i.test(content)) {
    type = "Business Strategy";
  } else if (/(research|study|paper|analyze|insight|theory)/i.test(content)) {
    type = "Research";
  } else if (/(diet|gym|personal|habit|life|fitness)/i.test(content)) {
    type = "Personal";
  } else if (/(post|blog|video|social|marketing|youtube)/i.test(content)) {
    type = "Content";
  }

  // Priority detection
  let priority = "Medium";
  if (/(urgent|critical|high|must|asap|blocker|important)/i.test(content)) {
    priority = "High";
  } else if (/(low|minor|maybe|later|nice to have|backlog)/i.test(content)) {
    priority = "Low";
  }

  // Tag extraction
  const tags = [];
  const keywordMap = {
    "Matching": /match|partner|peer|connect/i,
    "Students": /student|class|college|learn/i,
    "Productivity": /productivity|work|focus|speed/i,
    "Mobile": /mobile|phone|app|responsive/i,
    "AI": /ai|artificial|nlp|smart|extract/i,
    "Database": /database|db|mongo|sql|store/i,
    "UI/UX": /ui|ux|design|theme|layout|look/i,
    "Social": /social|chat|friend|teammate/i
  };

  for (const [tag, regex] of Object.entries(keywordMap)) {
    if (regex.test(content)) {
      tags.push(tag);
    }
  }

  if (tags.length === 0) {
    tags.push("Idea");
    tags.push("General");
  }

  return { title, project, type, priority, tags };
}

// Heuristic fallback for idea expansion
function expandHeuristics(idea) {
  const problemStatement = `Currently, individuals working in "${idea.project}" face bottlenecks due to a lack of automated structure for "${idea.title}". Without this capability, tasks or concepts like "${idea.content.substring(0, 60)}..." require manual overhead, creating friction and reducing efficiency.`;

  const proposedSolution = `The proposed solution is to build a streamlined workflow for "${idea.title}". This creates a dedicated system tailored for "${idea.type}" use cases, leveraging tags like "${idea.tags.join(', ')}" to classify, trace, and action ideas in real-time.`;

  const targetUsers = `Students, creators, and developers working within the "${idea.project}" ecosystem who want to quickly organize their concepts.`;

  const expectedImpact = `Enables extremely fast capture, better structural layout of thoughts, and a reduction of time spent manually converting thoughts into actionable items.`;

  const nextSteps = [
    `Outline wireframes and detailed specifications for "${idea.title}".`,
    `Create database schema designs and basic API definitions.`,
    `Build a functional prototype and gather feedback from peers.`
  ];

  return { problemStatement, proposedSolution, targetUsers, expectedImpact, nextSteps };
}

// @route   POST /api/ideas
// @desc    Extract metadata and save a new idea
router.post('/', async (req, res) => {
  try {
    const { userId, content, project, type, priority } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });

    let extracted = null;
    let apiKey = req.headers['x-gemini-key'];

    if (!apiKey) {
      try {
        const user = await User.findById(userId);
        if (user && user.geminiApiKey) {
          const { decrypt } = require('../utils/crypto');
          apiKey = decrypt(user.geminiApiKey);
        }
      } catch (err) {
        console.error('Failed to decrypt database API key:', err.message);
      }
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Analyze this idea text: "${content}"
Extract the following details as a raw JSON object with these keys:
- "title": A concise title (3-6 words) summarizing the idea.
- "project": The name of the project it belongs to (e.g. PeerColab, StudySync, or default to "General" if not specified).
- "type": One of these: "Feature", "Startup Idea", "Business Strategy", "Research", "Technical", "Content", "Personal", "Other".
- "priority": One of "Low", "Medium", "High".
- "tags": An array of 2-4 relevant keywords/tags.

Response MUST be ONLY the raw JSON object, without markdown formatting or code blocks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();
        extracted = JSON.parse(cleanText);
      } catch (err) {
        console.error('Gemini extraction failed, using heuristics fallback:', err.message);
      }
    }

    // Fallback to heuristics if AI failed or key was not present
    if (!extracted) {
      extracted = extractHeuristics(content);
    }

    const userProject = project && project.trim() ? project.trim() : null;
    const userType = type && type.trim() ? type.trim() : null;
    const userPriority = priority && priority.trim() ? priority.trim() : null;

    const newIdea = new Idea({
      user: userId,
      content: content.trim(),
      title: extracted.title || 'Untitled Idea',
      project: userProject || extracted.project || 'General',
      type: userType || extracted.type || 'Feature',
      priority: userPriority || extracted.priority || 'Medium',
      tags: extracted.tags || ['Idea'],
      favorite: false
    });

    const savedIdea = await newIdea.save();
    res.status(201).json(savedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating idea', error: error.message });
  }
});

// @route   GET /api/ideas/user/:userId
// @desc    Get all ideas for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const ideas = await Idea.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching ideas', error: error.message });
  }
});

// @route   GET /api/ideas/:ideaId
// @desc    Get details of a single idea (Public)
router.get('/:ideaId', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId).populate('user', 'username email');
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching idea details', error: error.message });
  }
});

// @route   PUT /api/ideas/:ideaId/favorite
// @desc    Toggle favorite status of an idea
router.put('/:ideaId/favorite', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    idea.favorite = !idea.favorite;
    await idea.save();
    res.json(idea);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating favorite status', error: error.message });
  }
});

// @route   DELETE /api/ideas/:ideaId
// @desc    Delete an idea
router.delete('/:ideaId', async (req, res) => {
  try {
    const idea = await Idea.findByIdAndDelete(req.params.ideaId);
    if (!idea) return res.status(404).json({ message: 'Idea not found' });
    res.json({ message: 'Idea deleted successfully', id: req.params.ideaId });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting idea', error: error.message });
  }
});

// @route   POST /api/ideas/:ideaId/expand
// @desc    Expand the idea using AI or heuristics
router.post('/:ideaId/expand', async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.ideaId);
    if (!idea) return res.status(404).json({ message: 'Idea not found' });

    let expanded = null;
    let apiKey = req.headers['x-gemini-key'];

    if (!apiKey) {
      try {
        const user = await User.findById(idea.user);
        if (user && user.geminiApiKey) {
          const { decrypt } = require('../utils/crypto');
          apiKey = decrypt(user.geminiApiKey);
        }
      } catch (err) {
        console.error('Failed to decrypt database API key for expand:', err.message);
      }
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Analyze this idea:
Title: "${idea.title}"
Content: "${idea.content}"
Project: "${idea.project}"
Type: "${idea.type}"
Priority: "${idea.priority}"
Tags: ${JSON.stringify(idea.tags)}

Generate an expansion of this idea in JSON format with these exact keys:
- "problemStatement": A clear paragraph defining the problem this idea addresses.
- "proposedSolution": A clear paragraph outlining how the idea solves it.
- "targetUsers": A short sentence or list defining who benefits from this.
- "expectedImpact": A short sentence or paragraph outlining the positive outcomes.
- "nextSteps": An array of 3 actionable next steps.

Response MUST be ONLY the raw JSON object, without markdown formatting or code blocks.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanText = text.replace(/```json|```/g, '').trim();
        expanded = JSON.parse(cleanText);
      } catch (err) {
        console.error('Gemini expansion failed, using heuristics fallback:', err.message);
      }
    }

    if (!expanded) {
      expanded = expandHeuristics(idea);
    }

    idea.aiExpanded = {
      problemStatement: expanded.problemStatement || '',
      proposedSolution: expanded.proposedSolution || '',
      targetUsers: expanded.targetUsers || '',
      expectedImpact: expanded.expectedImpact || '',
      nextSteps: expanded.nextSteps || []
    };

    const updatedIdea = await idea.save();
    res.json(updatedIdea);
  } catch (error) {
    res.status(500).json({ message: 'Server Error expanding idea', error: error.message });
  }
});

module.exports = router;
