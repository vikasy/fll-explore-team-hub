
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config();

admin.initializeApp();
const db = admin.firestore();

// Configure your email transport (use Gmail or a service account)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Helper: get all messages from today (UTC)
async function getTodaysMessages() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const snapshot = await db.collection('parent_conversation')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('timestamp', '<=', admin.firestore.Timestamp.fromDate(end))
    .orderBy('timestamp', 'asc')
    .get();
  return snapshot.docs.map(doc => doc.data());
}

// Helper: get all opted-in parents
async function getOptedInParents() {
  const snapshot = await db.collection('parent_nightly_optin').where('optIn', '==', true).get();
  return snapshot.docs.map(doc => doc.data().email);
}

// Helper: format messages as HTML
function formatMessages(messages) {
  if (!messages.length) return '<p>No messages today.</p>';
  return messages.map(msg =>
    `<div><b>${msg.sender}</b> <span style="color:#888;">${msg.time || ''}</span><br>${msg.text}</div><hr>`
  ).join('');
}

// Scheduled function (runs every night at 11:59pm UTC)
exports.sendNightlySummary = functions.pubsub.schedule('59 23 * * *').timeZone('UTC').onRun(async (context) => {
  const messages = await getTodaysMessages();
  const emails = await getOptedInParents();
  if (!emails.length) return null;
  const html = `<h2>Parent Conversation Summary for ${new Date().toLocaleDateString()}</h2>` + formatMessages(messages);
  const mailOptions = {
    from: `FLL Explore Team <${process.env.GMAIL_USER}>`,
    to: emails,
    subject: 'Nightly Parent Conversation Summary',
    html
  };
  await transporter.sendMail(mailOptions);
  console.log('Nightly summary sent to:', emails);
  return null;
});
