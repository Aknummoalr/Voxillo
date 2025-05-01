require('dotenv').config();
const {GoogleGenAI} = require("@google/genai")
const {Type} = require("@google/genai")
const {GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenAI({apiKey : process.env.GEMINI_API_KEY});
const embedAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_2);

const transferHumanFunctionDeclaration =  {
  name: "transferToHuman",
  description: "When user ask about rohit hans or want to transfer call to rohit",
  // parameters: {
  //   type: Type.OBJECT,
  //   properties: {
  //     transferType:{
  //       type: Type.STRING,
  //       enum:['dial'],
  //       description:"type of call transfer. Use `dial`. "
  //     },
  //     phoneNumber: {
  //       type: Type.STRING,
  //       enum:['+919781841490'],
  //       description: "Phone number of the human to transfer the call to "
  //     }
  //   },
  //   required:['transferType', 'phoneNumber']
  //   }
};

function setHumanTransfer(transferType, phoneNumber){
  return{
    type:transferType,
    number:phoneNumber
  }
}

const storeForReview = {
  name:"storeForReview",
  description:"Use this when the assistant is unsure about the answer or needs human review",
  parameters:{
    type:"object",
    properties:{
      reason:{
        type:"string",
        description:"Why the assistatnt wants to store this question"
      }
    },
    required:["reason"]
  }
}



const embedModel = embedAI.getGenerativeModel({model:'embedding-001'});

async function getEmbedding(userInput) {
  const result = await embedModel.embedContent({
    content: {parts : [{ text: userInput}]}
  })
  const embedding = result.embedding.values;
  return embedding;
}

let chatHistory = []

async function processQuery(query) {
  const maxRetries = 3;
  let attempt = 0;

  const config = {
    tools: [{
      functionDeclarations: [transferHumanFunctionDeclaration]
    }]
  };

  const contents = [
    {
      role: 'user',
      parts: [{ text: query }]
    }
  ];

  chatHistory.push({
    role:'user',
    parts:[{ text : query}]
  });

  const history = [
    {
      role:'model',
      parts:[{text : `you are helpful assistant`}]
    }
  ]

  while (attempt < maxRetries) {
    try {
      console.log(`Sending query to Gemini (attempt ${attempt + 1}):`, { query });
      
      const answer = await genAI.models.generateContent({
        model: 'models/gemini-1.5-flash',
        history: history,
        //contents: contents,
        contents: chatHistory,
        config:config
      });  

      const response = answer.text;
      
      if(response == undefined){
        const tool_call = answer.functionCalls[0];
        let result;
        if(tool_call.name==='transferToHuman'){
          result = setHumanTransfer('dial','+916239240395');
          //result = setHumanTransfer(tool_call.args.transferType, tool_call.args.phoneNumber)
          const obj ={
            type: result.type,
            number: result.number
          }
          console.log("Call will be transfered");
          return obj;
        }
      }
      
      chatHistory.push({
        role:'model',
        parts:[{text : response}]
      })

      return {
        type: 'text',
        message: response.trim()
      };

    } catch (error) {
      attempt++;
      console.error(`Gemini API error (attempt ${attempt}):`, error.message, error.stack);
      if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
        console.error('Fatal: Invalid Gemini API key. Please verify GEMINI_API_KEY in .env and ensure it is enabled in Google Cloud Console.');
        return `Sorry, the assistant is unavailable due to an invalid API key. Please try again later.`;
      }
      if (attempt === maxRetries) {
        console.error('Max retries reached. Returning fallback response.');
        return `Sorry, I couldn’t process your request. Please try again.`;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

module.exports = { processQuery, getEmbedding  };