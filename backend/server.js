require('dotenv').config();
const express = require('express');
const cors = require('cors');

const submissionRoutes = require('./src/routes/submissions');
const articleRoutes    = require('./src/routes/articles');
const { startRssFetcher } = require('./src/services/rssFetcher');

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/submissions', submissionRoutes);
app.use('/api/articles',    articleRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  startRssFetcher(); // Start RSS auto-fetch on boot
});
