// generateTTS-openai.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT; // no trailing slash
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_DEPLOYMENT_ID = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
const API_VERSION = '2024-02-15-preview';

export async function generateOpenAITTS({
  text,
  outputPath,
  voice = 'alloy',       // other options: echo, fable, nova, shimmer
  format = 'wav',
  speed = 1.0
}) {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_ID}/audio/speech?api-version=${API_VERSION}`;

  const headers = {
    'Content-Type': 'application/json',
    'api-key': AZURE_OPENAI_KEY
  };

  const body = {
    input: text,
    voice,
    response_format: format,
    speed
  };

  try {
    const response = await axios.post(url, body, {
      headers,
      responseType: 'arraybuffer'
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, response.data);
    console.log(`✅ Audio saved to ${outputPath}`);
  } catch (error) {
    console.error('❌ OpenAI TTS failed:', error?.response?.data || error.message);
    throw error;
  }
}