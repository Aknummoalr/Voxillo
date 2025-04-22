const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const { handleGather } = require('../services/twilio');
const router = express.Router();

router.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.gather({
    input: 'speech',
    action: '/twilio/gather',
    speechTimeout: 'auto',
    hints: 'help, information, support', // Added from article for better speech recognition
  }).say({ voice: 'Polly.Joanna-Neural' }, 'Welcome to the ChatGPT assistant. Please speak your query.');
  res.type('text/xml');
  res.send(twiml.toString());
});

router.post('/gather', async (req, res) => {
  const { CallSid, From, To, SpeechResult } = req.body;
  if (!SpeechResult) {
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, I didn’t hear anything. Please try again.');
    twiml.redirect('/twilio/voice');
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }
  const twiml = await handleGather(CallSid, From, To, SpeechResult);
  res.type('text/xml');
  res.send(twiml);
});

module.exports = router;