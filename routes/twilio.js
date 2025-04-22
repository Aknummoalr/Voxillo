const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const { handleGather } = require('../services/twilio');
const twilio = require('twilio');
const config = require('../config');

const router = express.Router();
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// Handle GET for webhook verification
router.get('/voice', (req, res) => {
  res.status(200).send('Twilio webhook endpoint');
});

// Handle POST for voice webhook
router.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  twiml.gather({
    input: 'speech',
    action: '/twilio/gather',
    speechTimeout: 'auto',
    hints: 'help, information, support',
  }).say({ voice: 'Polly.Joanna-Neural' }, 'Welcome to the ChatGPT assistant. Please speak your query.');
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle POST for gathered speech
router.post('/gather', async (req, res) => {
  console.log('Received webhook:', req.body);
  if (!req.body) {
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Invalid request. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }

  const { CallSid, From, To, SpeechResult } = req.body;
  if (!CallSid || !From || !To) {
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Missing call details. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
    return;
  }

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

router.post('/outbound', async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Recipient phone number is required' });
  }

  try {
    const call = await twilioClient.calls.create({
      to,
      from: config.twilio.phoneNumber,
      url: ${config.serverUrl}/twilio/voice,
      method: 'POST',
    });
    res.json({ message: 'Outbound call initiated', callSid: call.sid });
  } catch (error) {
    console.error('Error initiating outbound call:', error);
    res.status(500).json({ error: 'Failed to initiate outbound call' });
  }
});

module.exports = router;