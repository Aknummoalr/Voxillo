const twilio = require('twilio');
const { VoiceResponse } = require('twilio').twiml;
const Call = require('../models/call');
const Conversation = require('../models/conversation');
const { processQuery } = require('./openai');

async function handleGather(callSid, from, to, speechResult) {
  const twiml = new VoiceResponse();

  try {
    // Store or update call metadata
    let call = await Call.findOne({ callSid });
    if (!call) {
      call = new Call({ callSid, from, to });
      await call.save();
    }

    // Process speech input with ChatGPT, including conversation history
    const history = await Conversation.find({ callSid })
      .sort({ timestamp: 1 })
      .limit(20); // Limit to last 20 messages, as in the article
    const conversationHistory = history.map(entry => [
      { role: 'user', content: entry.userInput },
      { role: 'assistant', content: entry.assistantResponse }
    ]).flat();

    const response = await processQuery(speechResult, conversationHistory);

    // Store conversation
    const conversation = new Conversation({
      callSid,
      userInput: speechResult,
      assistantResponse: response,
    });
    await conversation.save();

    // Delete oldest message if history exceeds 20
    const conversationCount = await Conversation.countDocuments({ callSid });
    if (conversationCount > 20) {
      const oldest = await Conversation.findOne({ callSid }).sort({ timestamp: 1 });
      await Conversation.deleteOne({ _id: oldest._id });
    }

    // Respond with Amazon Polly Neural voice
    twiml.say({ voice: 'Polly.Joanna-Neural' }, response);
    twiml.redirect('/twilio/voice');

    return twiml.toString();
  } catch (error) {
    console.error('Error in handleGather:', error);
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
    twiml.redirect('/twilio/voice');
    return twiml.toString();
  }
}

module.exports = { handleGather };