const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
//const { handleGather } = require('../services/twilio');
const twilio = require('twilio');
const config = require('../config');
const { processQuery } = require('../services/gemini');
const { storeConversation } = require('../services/pinecone');
const router = express.Router();
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

const sid =[];

router.get('/voice', (req, res) => {
  res.status(200).send('Twilio webhook endpoint');
});

router.post('/voice',async (req, res) => {
  console.log('voice run');
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;

  try {
    console.log("Call SId :", callSid);

    //check if user called first time or not
    if(!sid.includes(callSid)){
      twiml.say({voice:'Polly.Kajal-Neural'}, "Hello, thank You for contacting me,  Ask me Your Question ")
    }
    else{
      twiml.say({voice:'Polly.Kajal-Neural'},"Ask me Your next Question");
    }

    sid.push(callSid);
    
    twiml.gather({
      input:'speech',
      speechTimeout:'auto',
      speechModel:'experimental_conversations',
      action:'/twilio/gather',
      method:'POST',
    });
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Error in /voice:', error.message, error.stack);
    twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Sorry, an error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});



router.post('/gather', async (req, res) => {
  const twiml = new VoiceResponse();
  const { SpeechResult, CallSid, From,To } = req.body;  
  if (!SpeechResult) {
    twiml.say({ voice: 'Polly.Kajal-Neural' }, "Sorry, I didn't hear anything. Please say that again.");
    twiml.redirect('/twilio/voice');  // Redirect phirse
    return res.type('text/xml').send(twiml.toString());
  }

  console.log("Caller said:", SpeechResult);

  try {
    const geminiResponse = await processQuery(SpeechResult);
    
    if (geminiResponse.type === 'dial') {
      twiml.say({ voice: 'Polly.Kajal-Neural' }, "Transferring you now...");
      
      twiml.dial(geminiResponse.number);  
      
    } else {
      twiml.say({ voice: 'Polly.Kajal-Neural' }, geminiResponse.message);
      twiml.pause({ length: 2 });
      twiml.redirect('/twilio/voice');
    }
    
    await storeConversation({
      callSid: CallSid,
      from:From,
      to:To,
      userInput: SpeechResult,
      assistantResponse: geminiResponse.message || 'NO response'
    })

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error("Error in /gather:", error.message, error.stack);
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, there was an issue processing your request.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});




router.post('/outbound', async (req, res) => {
  console.log("call")
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Recipient phone number is required' });
  }
  try {
    const call = await twilioClient.calls.create({
      to,
      from: config.twilio.phoneNumber,
      url: `${config.serverUrl}/twilio/voice`,
      method: 'POST',
    });
    res.json({ message: 'Outbound call initiated', callSid: call.sid });
  } catch (error) {
    console.error('Error initiating outbound call:', error);
    res.status(500).json({ error: 'Failed to initiate outbound call' });
  }
});

module.exports = router;