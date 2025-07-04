const path = require('path');
const fs = require('fs').promises;

const {GoogleGenAI} = require('@google/genai');

const { readFile } = require('./readfile');

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const main_page = process.env.MAIN_URL
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

// use prompt and get gemini response from prompt, send as email
async function gemini(prompt) {
  try {
    const content = await readFile(path.join(__dirname, './../../txt/prompt.txt'));
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: content + prompt,
    });
    await fs.writeFile(path.join(__dirname,"./../../txt/output.txt"), response.text, 'utf8');
    return response.text;

  } catch (e) {
    console.log('./src/common err:', e);
    return true;
  }
}
module.exports = { 
  gemini 
};