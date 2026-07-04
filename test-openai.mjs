import OpenAI from 'openai';
import fs from 'fs';
import https from 'https';

const FILE = './test.mp4';

const agent = new https.Agent({
  keepAlive: false,        // fresh connection, no reuse
  maxSockets: 1,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: agent,
  timeout: 180_000,
  maxRetries: 0,
});

async function main() {
  const sizeMB = (fs.statSync(FILE).size / 1024 / 1024).toFixed(1);
  console.log(`📄 ${FILE} (${sizeMB} MB)  — trying HTTP/1.1 keep-alive=false`);
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(FILE),
      model: 'whisper-1',
    });
    console.log('✅ transcription OK:', resp.text.slice(0, 120));
  } catch (e) {
    console.error('❌ FAILED:', e.message, '| cause:', e.cause?.code || e.cause);
  }
}
main();