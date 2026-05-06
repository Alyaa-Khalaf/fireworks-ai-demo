const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// serve static files
app.use(express.static(__dirname));

// home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/generate-image', async (req, res) => {
  const prompt = req.query.prompt;
  try {
    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&seed=${Date.now()}`
    );
    if (!response.ok) return res.status(500).json({ error: 'Failed' });
    const buffer = await response.buffer();
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));