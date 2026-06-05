const express = require('express');
const router = express.Router();

const quotesList = [
    { text: "Consistency beats talent when talent doesn't work hard.", author: "Tim Notke" },
    { text: "Simple code is sustainable code.", author: "Unknown" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" }
];

// @route   GET /api/quotes/daily
// @desc    Get the quote of the day based on the calendar date
router.get('/daily', (req, res) => {
    // Uses the day of the month to pick an index, ensuring it stays consistent all day
    const dayOfMonth = new Date().getDate();
    const quoteIndex = dayOfMonth % quotesList.length;
    
    res.json(quotesList[quoteIndex]);
});

module.exports = router;