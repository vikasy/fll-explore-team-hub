// Simple Express.js backend for team to-dos
// Save as api/server.js and run with: node api/server.js

const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = __dirname + '/tasks.json';

app.use(cors({ origin: 'https://vikasy.github.io' }));
app.use(express.json());

// Helper to read tasks from file
function readTasks() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// Helper to write tasks to file
function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// GET all tasks
app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

// POST a new task
app.post('/api/tasks', (req, res) => {
  const { task } = req.body;
  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'Task is required' });
  }
  const tasks = readTasks();
  tasks.push(task);
  writeTasks(tasks);
  res.status(201).json({ success: true });
});

// DELETE a task by index
app.delete('/api/tasks/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const tasks = readTasks();
  if (isNaN(idx) || idx < 0 || idx >= tasks.length) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  tasks.splice(idx, 1);
  writeTasks(tasks);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`To-Do API server running at http://localhost:${PORT}/api/tasks`);
});
