const express = require('express');
const router  = express.Router();
const { getArticles, analyzeArticle } = require('../controllers/articleController');

router.get('/',             getArticles);
router.post('/:id/analyze', analyzeArticle);

module.exports = router;
