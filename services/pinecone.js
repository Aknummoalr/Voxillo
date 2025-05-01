
const { Pinecone } = require('@pinecone-database/pinecone');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function createIndex() {
    try {
      await pc.createIndex({
        name: 'questions',
        dimension: 768, 
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1', 
          }
        }
      });
  
      console.log('Index created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Index already exists');
      } else {
        console.error('Failed to create index:', error.message);
      }
    }
  }
  
//createIndex();

const index = pc.Index('questions'); // Make sure this index exists and has dimension: 768

async function storeConversation({ callSid, from, to, userInput, assistantResponse, reason }) {
  const timestamp = new Date();
  const { getEmbedding } = require('./gemini');
  const embedding = await getEmbedding(userInput);

  await index.upsert([
    {
      id: callSid, 
      values: embedding,
      metadata: {
        from,
        to,
        userInput,
        assistantResponse,
        reason,
        defaultResponse: "will be added from frontend",
        timestamp: timestamp.toISOString()
      }
    }
  ]);
}

module.exports = { storeConversation };
