import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

/**
 * Direct API Access Utility Script
 * 
 * This file allows you to directly call and test:
 * 1. Google Gemini API (gemini-1.5-flash)
 * 2. Groq API (llama-3.3-70b-versatile)
 * 3. Local Backend Grounding Endpoints (POST /grounding/analyze & POST /grounding/generate)
 * 
 * Usage:
 * Run this script using npx from the backend directory:
 *   npx ts-node src/direct-access.ts <mode> <prompt>
 * 
 * Modes:
 *   gemini   - Call the Google Generative AI API directly
 *   groq     - Call the Groq SDK directly
 *   backend  - Call the local running backend REST endpoints
 *   test     - Run a complete diagnostic test suite across all engines
 */

const MODE = process.argv[2] || 'test';
const PROMPT = process.argv.slice(3).join(' ') || 'Write a market entry strategy for launching an organic skincare brand in Tokyo.';

async function testGeminiDirect(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.error('❌ Gemini API Key is missing or not configured in backend/.env');
    return null;
  }

  console.log(`\n--- Direct Gemini API Request (${prompt.slice(0, 40)}...) ---`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    console.log('⏳ Sending request to Gemini API (gemini-1.5-flash)...');
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const duration = Date.now() - startTime;
    const text = result.response.text();
    
    console.log(`✅ Success in ${duration}ms!`);
    console.log('📝 Response:\n', text);
    return text;
  } catch (error: any) {
    console.error('❌ Gemini API Call Failed:', error.message || error);
    return null;
  }
}

async function testGroqDirect(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.error('❌ Groq API Key is missing or not configured in backend/.env');
    return null;
  }

  console.log(`\n--- Direct Groq API Request (${prompt.slice(0, 40)}...) ---`);
  try {
    const groq = new Groq({ apiKey });
    
    console.log('⏳ Sending request to Groq API (llama-3.3-70b-versatile)...');
    const startTime = Date.now();
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }]
    });
    const duration = Date.now() - startTime;
    const text = response.choices[0]?.message?.content;
    
    console.log(`✅ Success in ${duration}ms!`);
    console.log('📝 Response:\n', text);
    return text;
  } catch (error: any) {
    console.error('❌ Groq API Call Failed:', error.message || error);
    return null;
  }
}

async function testBackendEndpoints(prompt: string) {
  const port = process.env.PORT || 3001;
  const baseUrl = `http://localhost:${port}`;
  
  console.log(`\n--- Local Backend REST Endpoint Requests via ${baseUrl} ---`);
  
  // 1. Test Health
  try {
    console.log('⏳ Fetching backend health status (/health)...');
    const healthRes = await fetch(`${baseUrl}/health`);
    if (!healthRes.ok) throw new Error(`Health returned status ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log('✅ Health Response:', JSON.stringify(healthData, null, 2));
  } catch (error: any) {
    console.error('❌ Backend Health endpoint is unreachable. Make sure the backend server is running! (npm run dev)');
    return;
  }

  // 2. Test Grounding Analyze
  let analysisResult: any = null;
  try {
    console.log(`\n⏳ Sending prompt to Grounding Analyze endpoint (/grounding/analyze)...`);
    const startTime = Date.now();
    const analyzeRes = await fetch(`${baseUrl}/grounding/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const duration = Date.now() - startTime;

    if (!analyzeRes.ok) throw new Error(`Analyze returned status ${analyzeRes.status}`);
    analysisResult = await analyzeRes.json();
    
    console.log(`✅ Analyze Success in ${duration}ms!`);
    console.log('📊 Grounding Analysis Result:', JSON.stringify(analysisResult, null, 2));
  } catch (error: any) {
    console.error('❌ Analyze API request failed:', error.message || error);
    return;
  }

  // 3. Test Grounding Generate (Normal response or Grounded response based on analysis risk)
  if (analysisResult) {
    try {
      const isHighRisk = analysisResult.risk === 'high';
      const assumptions = isHighRisk ? analysisResult.assumptions : [];
      // Provide mocked answers for any missing context questions identified
      const contextAnswers = isHighRisk && analysisResult.missingContext
        ? analysisResult.missingContext.map((q: string, i: number) => ({
            question: q,
            answer: `Mock answer context for question ${i + 1}: ${q}`
          }))
        : [];

      console.log(`\n⏳ Sending grounded request to Generation endpoint (/grounding/generate)...`);
      const startTime = Date.now();
      const generateRes = await fetch(`${baseUrl}/grounding/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          assumptions,
          contextAnswers
        })
      });
      const duration = Date.now() - startTime;

      if (!generateRes.ok) throw new Error(`Generate returned status ${generateRes.status}`);
      const generateData = await generateRes.json() as any;
      
      console.log(`✅ Generate Success in ${duration}ms!`);
      console.log('🤖 Grounded LLM Response:\n', generateData.response);
      console.log('ℹ️ Is Grounded:', generateData.isGrounded);
    } catch (error: any) {
      console.error('❌ Generate API request failed:', error.message || error);
    }
  }
}

async function main() {
  console.log('========================================================');
  console.log('       GROUNDING LAYER - DIRECT API ACCESS TOOL');
  console.log('========================================================');
  console.log(`Current Mode: ${MODE.toUpperCase()}`);
  console.log(`Active Prompt: "${PROMPT}"`);
  console.log('========================================================');

  switch (MODE.toLowerCase()) {
    case 'gemini':
      await testGeminiDirect(PROMPT);
      break;
    case 'groq':
      await testGroqDirect(PROMPT);
      break;
    case 'backend':
      await testBackendEndpoints(PROMPT);
      break;
    case 'test':
      console.log('\nStarting Full Diagnostic API Test Suite...');
      await testGeminiDirect(PROMPT);
      await testGroqDirect(PROMPT);
      await testBackendEndpoints(PROMPT);
      break;
    default:
      console.log(`❌ Unknown mode: ${MODE}`);
      console.log('Supported modes are: gemini | groq | backend | test');
  }
  
  console.log('\n========================================================');
  console.log('                    DIAGNOSTICS COMPLETED');
  console.log('========================================================');
}

main().catch(err => {
  console.error('Unhandled script error:', err);
});
