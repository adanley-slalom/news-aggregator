# News Aggregator - React + Node.js

A modern, full-stack news aggregator featuring a proportional treemap layout displaying real news headlines in an interactive card-based interface. Deployable to Vercel with serverless backend functions.

## Inspiration

This project is inspired by Newsmap, a pioneering Flash-based news visualization website created by Marcos Weskamp in 2004. Newsmap transformed headlines from Google News into a dynamic treemap, using color-coded tiles and proportional sizing to visually represent the relative prominence of news stories around the world. Rather than presenting news as a traditional list, it revealed patterns, trends, and editorial emphasis through a single, easily scannable interface.

## Live Demo

View the live application at: https://news-aggregator-plum-phi.vercel.app/

## Features

- **Dynamic Treemap Layout** - Cards scale proportionally based on 8 news categories
- **Real News Integration** - Fetches from major news RSS feeds
- **Text Auto-Sizing** - Headlines automatically fit within card boundaries
- **Category Filtering** - Toggle 8 news categories (U.S., World, Business, Technology, Entertainment, Sports, Science, Health)
- **Click-to-Read** - Open full articles in new tabs
- **Responsive Design** - Treemap dynamically recalculates and adapts to any window size; works seamlessly on desktop, tablet, and mobile devices with automatic layout reflow
- **Performance Caching** - News cached for 30 minutes to reduce API calls
- **Vercel Compatible** - Deploy backend as serverless functions, frontend as static site

## Tech Stack

**Backend:**
- Node.js + Express.js (for local development)
- Vercel Serverless Functions (for production)
- XML parsing (xml2js)
- Axios for HTTP requests
- CORS-enabled

**Frontend:**
- React 18
- Custom treemap algorithm
- CSS3 flexbox/absolute positioning

## API Endpoints

### GET `/api/news`
Returns news articles from Google News RSS feeds and places them in a treemap based on popularity.

Response format:
```json
[
  {
    "id": "TECHNOLOGY-0",
    "title": "Article Title",
    "description": "Short summary",
    "link": "https://example.com/article",
    "category": "technology",
    "score": 100,
    "source": "Source Publisher"
  }
]
```

### GET `/health`
Health check endpoint. Returns `{ "status": "ok" }`.

## Local Development

### Prerequisites
- Node.js 16+
- npm

### Installation
```bash
npm run install-all
```

This installs dependencies for root, server, and client.

### Running Locally
```bash
# Start both server and client concurrently
npm run dev

# Or run individually
npm run server  # Runs on http://localhost:5001
npm run client  # Runs on http://localhost:3000
```

The client runs on `http://localhost:3000` and proxies API requests to `http://localhost:5001/api/news` via the `REACT_APP_API_URL` environment variable.

## Deployment to Vercel

### Prerequisites
- Vercel account (free tier works)
- Git repository

### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the root folder (don't select `/client`)

3. **Deploy**
   - Vercel will automatically detect and use the `vercel.json` configuration file
   - Build settings are pre-configured: Install, build, and output directories are specified in `vercel.json`
   - The serverless function in `/api/news.js` will be deployed as an API route
   - The React app will be built and served from `/client/build`

### How It Works on Vercel
- **Frontend**: React app is built and served as static files
- **Backend**: Express handler in `/api/news.js` runs as a serverless function at `/api/news`
- **Environment**: Uses `/api/news` endpoint automatically (no need for `REACT_APP_API_URL` override)

## Project Structure
```
.
├── client/              # React frontend
│   ├── src/
│   │   ├── App.js       # Main component
│   │   ├── components/
│   │   │   └── NewsAggregator.js
│   │   └── ...
│   └── package.json
├── server/              # Express server (for local dev only)
│   ├── server.js
│   └── package.json
├── api/                 # Vercel serverless functions
│   └── news.js
├── vercel.json          # Vercel configuration
├── package.json         # Root configuration
└── README.md
```

## Troubleshooting

### "Failed to load news articles" on Vercel
- Check that `/api/news.js` is deployed correctly
- Verify the `vercel.json` rewrites configuration
- Check Vercel function logs in the dashboard

### Local development port conflicts
- Server defaults to port 5001, client to 3000
- Change ports with `PORT=8000 npm run server`

### Environment Variables
- No sensitive data needed for this app
- For future API keys, add to Vercel project settings → Environment Variables

## News Sources

The backend fetches from Google News RSS feeds with topic-specific categories:
- U.S. (Nation)
- World
- Business
- Technology
- Entertainment
- Sports
- Science
- Health

Articles are cached for 30 minutes and updated automatically.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development

### Planned Features

See [paywall-instructions.md](paywall-instructions.md) for implementation details on filtering paywalled articles from the news feed.

## License

MIT
