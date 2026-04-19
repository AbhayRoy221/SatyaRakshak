import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkKeys() {
  console.log('--- API Key Diagnostics ---');

  // 1. Check Groq
  try {
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_')) {
      console.log('❌ Groq: Key not set');
    } else {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      await groq.models.list();
      console.log('✅ Groq: Working perfectly');
    }
  } catch (err) {
    console.log(`❌ Groq: Failed - ${err.message}`);
  }

  // 2. Check Gemini
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
      console.log('❌ Gemini: Key not set');
    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('ping');
      console.log('✅ Gemini: Working perfectly');
    }
  } catch (err) {
    console.log(`❌ Gemini: Failed - ${err.message}`);
  }

  // 3. Check Tavily
  try {
    if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY.includes('your_')) {
      console.log('❌ Tavily: Key not set');
    } else {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query: 'test', include_answer: false })
      });
      if (res.ok) console.log('✅ Tavily: Working perfectly');
      else {
        const data = await res.json();
        console.log(`❌ Tavily: Failed - ${data.error || res.status}`);
      }
    }
  } catch (err) {
    console.log(`❌ Tavily: Failed - ${err.message}`);
  }

  // 4. Check Supabase
  try {
    if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes('your_')) {
      console.log('❌ Supabase: URL/Key not set');
    } else {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
      // Try to ping the database by fetching a generic limit 1
      const { data, error } = await supabase.from('source_reputation').select('domain').limit(1);
      if (error) {
        if (error.code === '42P01') {
          console.log('⚠️ Supabase: Connected successfully, but tables are not created yet (Run the SQL schema in your Supabase dashboard).');
        } else {
          console.log(`❌ Supabase: Failed - ${error.message}`);
        }
      } else {
        console.log('✅ Supabase: Working perfectly and tables exist');
      }
    }
  } catch (err) {
    console.log(`❌ Supabase: Failed - ${err.message}`);
  }
}

checkKeys();
