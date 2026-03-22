const express = require('express');
const router  = express.Router();
const {
  submitUrl,
  castVote,
  getCommunityFeed,
  getLeaderboard,
} = require('../controllers/submissionController');

router.post('/',              submitUrl);
router.post('/:id/vote',      castVote);
router.get('/feed',           getCommunityFeed);
router.get('/leaderboard',    getLeaderboard);

module.exports = router;
