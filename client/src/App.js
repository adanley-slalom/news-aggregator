import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewsAggregator from './components/NewsAggregator';
import './App.css';

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [visibleCategories, setVisibleCategories] = useState({
    us: true,
    world: true,
    business: true,
    technology: true,
    entertainment: true,
    sports: true,
    science: true,
    health: true
  });

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // Use environment variable for API URL, fallback to current host
        const apiUrl = process.env.REACT_APP_API_URL || '/api/news';
        const response = await axios.get(apiUrl);
        setArticles(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load news articles');
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="App">
      {loading && (
        <div className="loading">
          <div className="spinner-container">
            <div className="spinner"></div>
            <p>Loading Latest News...</p>
          </div>
        </div>
      )}
      {error && <div className="error">{error}</div>}
      {!loading && articles.length > 0 && (
        <NewsAggregator articles={articles} visibleCategories={visibleCategories} setVisibleCategories={setVisibleCategories} />
      )}
    </div>
  );
}

export default App;
