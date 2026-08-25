const axios = require('axios');
const xml2js = require('xml2js');

const parser = new xml2js.Parser();

// Cache for news articles (refresh every 30 minutes)
let newsCache = {
  articles: [],
  timestamp: 0
};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Category keywords for classification
const categoryKeywords = {
  us: ['united states', 'usa', 'american', 'congress', 'senate', 'us election', 'washington'],
  world: ['world', 'international', 'global', 'china', 'india', 'russia', 'europe', 'uk', 'japan', 'korea', 'middle east', 'africa', 'latin america', 'vaccine'],
  business: ['business', 'economy', 'market', 'stock', 'finance', 'company', 'corporate', 'ceo', 'earnings', 'trade'],
  technology: ['technology', 'ai', 'software', 'tech', 'startup', 'app', 'data', 'cyber', 'digital', 'cloud', 'crypto', 'blockchain'],
  entertainment: ['entertainment', 'movie', 'film', 'celebrity', 'music', 'actor', 'hollywood', 'tv', 'netflix', 'streaming'],
  sports: ['sports', 'football', 'basketball', 'baseball', 'soccer', 'nfl', 'nba', 'mlb', 'athlete', 'game', 'championship', 'olympic'],
  science: ['science', 'research', 'study', 'physics', 'biology', 'chemistry', 'space', 'nasa', 'discovery', 'scientific', 'scientist'],
  health: ['health', 'doctor', 'medical', 'disease', 'virus', 'covid', 'hospital', 'patient', 'drug', 'treatment', 'diagnosis', 'mri', 'cancer', 'clinical', 'trial', 'vaccine', 'pharma', 'medicine', 'surgeon', 'epidemic', 'pandemic']
};

// Categorize article based on title and description
function categorizeArticle(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'world'; // default category
}

// Google News RSS topic feeds (one per category)
const GOOGLE_NEWS_PARAMS = 'hl=en-US&gl=US&ceid=US:en';
const googleNewsFeeds = [
  { category: 'us', topic: 'NATION' },
  { category: 'world', topic: 'WORLD' },
  { category: 'business', topic: 'BUSINESS' },
  { category: 'technology', topic: 'TECHNOLOGY' },
  { category: 'entertainment', topic: 'ENTERTAINMENT' },
  { category: 'sports', topic: 'SPORTS' },
  { category: 'science', topic: 'SCIENCE' },
  { category: 'health', topic: 'HEALTH' }
];

// Strip the trailing " - Publisher" that Google News appends to titles
function cleanGoogleTitle(title) {
  const idx = title.lastIndexOf(' - ');
  return idx > 0 ? title.substring(0, idx).trim() : title;
}

// Fetch news from Google News RSS feeds
async function fetchNewsFromFeeds() {
  const articles = [];

  for (const { category, topic } of googleNewsFeeds) {
    const feedUrl = `https://news.google.com/rss/headlines/section/topic/${topic}?${GOOGLE_NEWS_PARAMS}`;

    try {
      const response = await axios.get(feedUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' }
      });

      const result = await parser.parseStringPromise(response.data);
      const items = result.rss?.channel?.[0]?.item || [];

      items.forEach((item, index) => {
        const rawTitle = item.title?.[0]?.trim() || '';
        const description = item.description?.[0]?.trim() || '';
        const link = item.link?.[0]?.trim() || '';
        const source = item.source?.[0]?._?.trim() || 'Google News';

        if (rawTitle && rawTitle.length > 0) {
          articles.push({
            id: `${topic}-${index}`,
            title: cleanGoogleTitle(rawTitle).substring(0, 200),
            description: description.substring(0, 150),
            link: link,
            category: category,
            score: 100 - index, // Weight by position within the topic feed
            source: source
          });
        }
      });
    } catch (error) {
      console.error(`Error fetching from ${feedUrl}:`, error.message);
    }
  }

  return articles;
}

// Select 16 articles ensuring diversity across categories
function selectDiverseArticles(allArticles) {
  const categories = ['us', 'world', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'];
  const selected = [];
  const usedIndexes = new Set();
  
  // First pass: two from each category
  for (const cat of categories) {
    let count = 0;
    const categoryArticles = [];
    
    for (let i = 0; i < allArticles.length; i++) {
      if (!usedIndexes.has(i) && allArticles[i].category === cat) {
        categoryArticles.push({ article: allArticles[i], index: i });
      }
    }
    
    categoryArticles.sort((a, b) => b.article.score - a.article.score);
    
    for (const item of categoryArticles.slice(0, 2)) {
      if (selected.length >= 16) break;
      selected.push(item.article);
      usedIndexes.add(item.index);
      count++;
    }
  }
  
  return selected.slice(0, 16);
}

// Serverless handler for /api/news
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const now = Date.now();
    
    // Check cache
    if (newsCache.articles.length > 0 && now - newsCache.timestamp < CACHE_DURATION) {
      console.log('Serving from cache');
      return res.status(200).json(newsCache.articles);
    }
    
    console.log('Fetching fresh news...');
    const allArticles = await fetchNewsFromFeeds();
    
    if (allArticles.length === 0) {
      return res.status(500).json({ error: 'No articles fetched' });
    }
    
    const selected = selectDiverseArticles(allArticles);
    
    // Update cache
    newsCache = {
      articles: selected,
      timestamp: now
    };
    
    res.status(200).json(selected);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};
