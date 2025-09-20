/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started


const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

const TASKS_COLLECTION = "tasks";

// GET /tasks - list all tasks
app.get("/tasks", async (req, res) => {
  try {
    const snapshot = await db.collection(TASKS_COLLECTION).get();
    const tasks = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(tasks);
  } catch (err) {
    logger.error("GET /api/tasks error", err);
    res.status(500).json({error: "Failed to fetch tasks"});
  }
});

// POST /tasks - add a new task
app.post("/tasks", async (req, res) => {
  try {
    const {text, done} = req.body;
    if (typeof text !== "string") {
      return res.status(400).json({error: "Missing or invalid 'text'"});
    }
    const docRef = await db
        .collection(TASKS_COLLECTION)
        .add({text, done: !!done});
    const response = {
      id: docRef.id,
      text,
      done: !!done,
    };
    res.status(201).json(response);
  } catch (err) {
    logger.error("POST /api/tasks error", err);
    res.status(500).json({error: "Failed to add task"});
  }
});

// PATCH /tasks/:id - update a task (e.g., mark done)
app.patch("/tasks/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const {done} = req.body;
    if (typeof done !== "boolean") {
      return res.status(400).json({error: "Missing or invalid 'done'"});
    }
    await db.collection(TASKS_COLLECTION).doc(id).update({done});
    res.json({id, done});
  } catch (err) {
    logger.error("PATCH /api/tasks/:id error", err);
    res.status(500).json({error: "Failed to update task"});
  }
});

// DELETE /tasks/:id - delete a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const {id} = req.params;
    await db.collection(TASKS_COLLECTION).doc(id).delete();
    res.json({id});
  } catch (err) {
    logger.error("DELETE /api/tasks/:id error", err);
    res.status(500).json({error: "Failed to delete task"});
  }
});

exports.api = onRequest(app);
