const { Schema, model } = require('mongoose');

const conversationSchema = new Schema({
  callSid: { type: String, required: true },
  userInput: { type: String, required: true },
  assistantResponse: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = model('Conversation', conversationSchema);