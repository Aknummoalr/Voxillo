const { OpenAI } = require('openai');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

async function processQuery(query, conversationHistory = []) {
  try {
    const messages = [
      { role: 'system', content: 'You are a helpful, creative, and friendly assistant.' },
      ...conversationHistory,
      { role: 'user', content: query }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Matches article's model
      messages,
      max_tokens: 150, // Added to limit response length, inspired by article
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenAI error:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

module.exports = { processQuery };