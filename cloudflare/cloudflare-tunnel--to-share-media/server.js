const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const mediaDir = path.join(__dirname, 'media');

// Serve static files so browser can access them
app.use('/media', express.static(mediaDir));
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch all file names
app.get('/api/media', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const start = (page - 1) * limit;
  const end = page * limit;

  fs.readdir(mediaDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to read media directory' });

    // Sort files by "last modified" date (latest first)
    const sortedFiles = files
      .map(file => {
        const filePath = path.join(mediaDir, file);
        const stats = fs.statSync(filePath);
        return { name: file, mtime: stats.mtime };
      })
      .sort((a, b) => a.mtime - b.mtime) // newest first
      .map(f => f.name);

    const paginatedFiles = sortedFiles.slice(start, end);

    res.json({
      files: paginatedFiles,
      hasMore: end < files.length
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
