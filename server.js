const express = require('express');
const { MongoClient } = require('mongodb');
const twilioRoutes = require('./routes/twilio');
const config = require('./config');
const { startWebSocketServer } = require('./websocket');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// // MongoDB connection
// let db;
// MongoClient.connect(config.mongoUrl, { useUnifiedTopology: true })
//   .then((client) => {
//     db = client.db('twilio_chatgpt');
//     console.log('Connected to MongoDB');
//   })
//   .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/twilio', twilioRoutes);

// Start WebSocket server for Twilio Media Streams
startWebSocketServer();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});