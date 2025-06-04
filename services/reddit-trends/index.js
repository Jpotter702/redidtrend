require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.REDDIT_SERVICE_PORT || 3001;

app.use(cors());
app.use(express.json());

// Reddit API configuration
const REDDIT_API_BASE_URL = 'https://www.reddit.com';

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'reddit-trends' });
});

// Get trending posts from Reddit
app.post('/trends', async (req, res) => {
  try {
    const { 
      subreddits = ['all'], 
      dateRange = { from: null, to: null },
      searchType = 'hot', // 'hot', 'top', 'new', 'rising'
      customPrompt = ''
    } = req.body;

    const trendingPosts = await fetchTrendingPosts(subreddits, dateRange, searchType);
    
    // Filter or process posts based on customPrompt if provided
    let processedPosts = trendingPosts;
    if (customPrompt) {
      processedPosts = filterPostsByPrompt(trendingPosts, customPrompt);
    }

    res.json({
      trends: processedPosts,
      source: {
        subreddits,
        dateRange,
        searchType
      }
    });
  } catch (error) {
    console.error('Error fetching Reddit trends:', error.message);
    res.status(500).json({ error: 'Failed to fetch Reddit trends', details: error.message });
  }
});

// Function to fetch trending posts from Reddit
async function fetchTrendingPosts(subreddits, dateRange, searchType) {
  const posts = [];
  let hasError = false;
  
  for (const subreddit of subreddits) {
    try {
      // Construct the Reddit API URL based on parameters
      let url = `${REDDIT_API_BASE_URL}/r/${subreddit}/${searchType}.json?limit=25`;
      
      // Add time filter for 'top' search type
      if (searchType === 'top' && dateRange.from) {
        url += '&t=day'; // Default to day, could be more sophisticated based on dateRange
      }
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Reditrend/1.0.0'
        }
      });
      
      const fetchedPosts = response.data.data.children.map(child => ({
        id: child.data.id,
        subreddit: child.data.subreddit,
        title: child.data.title,
        content: child.data.selftext,
        url: child.data.url,
        permalink: `https://www.reddit.com${child.data.permalink}`,
        author: child.data.author,
        created: child.data.created_utc,
        score: child.data.score,
        upvoteRatio: child.data.upvote_ratio,
        numComments: child.data.num_comments,
        isVideo: child.data.is_video,
        mediaUrl: child.data.media?.reddit_video?.fallback_url || null,
        imageUrl: child.data.thumbnail && child.data.thumbnail !== 'self' ? child.data.thumbnail : null
      }));
      
      posts.push(...fetchedPosts);
    } catch (error) {
      console.error(`Error fetching from r/${subreddit}:`, error.message);
      hasError = true;
      // Continue with other subreddits even if one fails
    }
  }
  
  if (hasError && posts.length === 0) {
    throw new Error('Failed to fetch posts from any subreddit');
  }
  
  // Sort posts by score and comment count to identify true trends
  return posts.sort((a, b) => {
    // Weighted scoring: upvotes + (comments * 2)
    const scoreA = a.score + (a.numComments * 2);
    const scoreB = b.score + (b.numComments * 2);
    return scoreB - scoreA;
  });
}

// Function to filter posts based on a custom prompt
function filterPostsByPrompt(posts, prompt) {
  // This is a simplified implementation
  // In a real application, you might use AI/NLP to analyze posts against the prompt
  
  // Simple keyword matching
  const keywords = prompt.toLowerCase().split(' ');
  
  return posts.filter(post => {
    const titleAndContent = `${post.title} ${post.content}`.toLowerCase();
    return keywords.some(keyword => titleAndContent.includes(keyword));
  });
}

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Reddit trends service running on port ${PORT}`);
  });
}

module.exports = app;