// Simple Express.js backend for team to-dos
// Save as api/server.js and run with: node api/server.js

const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Firestore
const firestore = new Firestore();
const TASKS_COLLECTION = 'tasks';

app.use(cors({ origin: 'https://vikasy.github.io' }));
app.use(express.json());


// Helper to get all tasks from Firestore
async function getAllTasks() {
  const snapshot = await firestore.collection(TASKS_COLLECTION).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Helper to add a task to Firestore
async function addTask(task) {
  const docRef = await firestore.collection(TASKS_COLLECTION).add({ task });
  return { id: docRef.id, task };
}

// Helper to delete a task by id
async function deleteTask(id) {
  await firestore.collection(TASKS_COLLECTION).doc(id).delete();
}


// GET all tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await getAllTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});


// POST a new task
app.post('/api/tasks', async (req, res) => {
  const { task } = req.body;
  if (!task || typeof task !== 'string') {
    return res.status(400).json({ error: 'Task is required' });
  }
  try {
    const newTask = await addTask(task);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add task' });
  }
});


// DELETE a task by id
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await deleteTask(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


app.listen(PORT, () => {
  console.log(`To-Do API server running at http://localhost:${PORT}/api/tasks (Firestore mode)`);
});
