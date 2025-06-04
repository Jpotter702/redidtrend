require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.SCRIPT_SERVICE_PORT || 3002;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Script templates
const SCRIPT_TEMPLATES = {
  'podcast': 'Create a conversational script between two podcast hosts discussing this trending topic. Make it engaging, informative, and include some humor.',
  'storytelling': 'Create a storytelling narration that presents this trending topic in a captivating and dramatic way.',
  'educational': 'Create an educational script that explains this trending topic clearly with interesting facts and context.',
  'humorous': 'Create a humorous script that presents this trending topic in a funny and entertaining way.',
  'newscast': 'Create a newscast-style script that presents this trending topic in a professional journalistic manner.'
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'script-generator' });
});

// Get available script styles
app.get('/styles', (req, res) => {
  res.json({
    styles: Object.keys(SCRIPT_TEMPLATES)
  });
});

// Generate script from trend data
app.post('/generate', async (req, res) => {
  try {
    const { trendData, style = 'podcast' } = req.body;
    
    if (!trendData || !trendData.trends || trendData.trends.length === 0) {
      return res.status(400).json({ error: 'No trend data provided' });
    }

    // Get the top trending post
    const topTrend = trendData.trends[0];
    
    // Generate script using OpenAI
    const script = await generateScript(topTrend, style);
    
    // Generate title and description
    const metadata = await generateMetadata(topTrend, script);
    
    res.json({
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      script: script,
      sourceTrend: {
        id: topTrend.id,
        subreddit: topTrend.subreddit,
        title: topTrend.title,
        url: topTrend.permalink
      }
    });
  } catch (error) {
    console.error('Error generating script:', error.message);
    res.status(500).json({ error: 'Failed to generate script', details: error.message });
  }
});

// Function to generate script using OpenAI
async function generateScript(trendData, style) {
  const template = SCRIPT_TEMPLATES[style] || SCRIPT_TEMPLATES.podcast;
  
  const prompt = `
${template}

Trending Topic from Reddit:
Title: ${trendData.title}
Subreddit: r/${trendData.subreddit}
Content: ${trendData.content || '(No additional content)'}
Comments: ${trendData.numComments}
Upvotes: ${trendData.score}

Create a script suitable for a 30-60 second YouTube Short video. The script should be engaging, concise, and formatted clearly with speaker parts if applicable.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4", // Or whichever model is appropriate
    messages: [
      { role: "system", content: "You are a creative script writer specializing in short-form video content." },
      { role: "user", content: prompt }
    ],
    max_tokens: 1000
  });

  return response.choices[0].message.content.trim();
}

// Function to generate metadata (title, description, tags)
async function generateMetadata(trendData, script) {
  const prompt = `
Based on this Reddit trend and script, generate:
1. A catchy title (max 60 characters)
2. A brief description (max 250 characters)
3. 5-7 relevant tags (comma separated)

Reddit Post: ${trendData.title}
Script: ${script.substring(0, 500)}...
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4", // Or whichever model is appropriate
    messages: [
      { role: "system", content: "You are a YouTube metadata optimization expert." },
      { role: "user", content: prompt }
    ],
    max_tokens: 500
  });

  const content = response.choices[0].message.content.trim();
  
  // Parse the response
  const titleMatch = content.match(/title:?(.*)/i);
  const descriptionMatch = content.match(/description:?(.*)/i);
  const tagsMatch = content.match(/tags:?(.*)/i);
  
  return {
    title: titleMatch ? titleMatch[1].trim() : `Trending on Reddit: ${trendData.title.substring(0, 50)}...`,
    description: descriptionMatch ? descriptionMatch[1].trim() : `A trending topic from Reddit: ${trendData.title}`,
    tags: tagsMatch ? tagsMatch[1].trim().split(',').map(tag => tag.trim()) : ['reddit', 'trending', trendData.subreddit]
  };
}

app.listen(PORT, () => {
  console.log(`Script generator service running on port ${PORT}`);
});