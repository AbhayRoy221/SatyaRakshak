const dotenv = require('dotenv');
dotenv.config();

async function testTavily() {
  const claim = "Two Indian jets downed, pilot captured by Pakistani forces...";
  const keywords = claim.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 8).join(' ');
  console.log("Keywords:", keywords);
  
  try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query: 'fact check: ' + keywords,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5
        })
      });
      
      const data = await response.json();
      console.log("Tavily Data:", JSON.stringify(data).substring(0, 500));
  } catch(e) {
      console.error(e);
  }
}

testTavily();
