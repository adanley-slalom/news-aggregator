import React, { useState, useEffect, useRef, useMemo } from 'react';
import './NewsAggregator.css';

// Squarified treemap layout algorithm.
// Input: array of numeric values (already sorted largest -> smallest).
// Output: array of { x, y, w, h } in the SAME order as the input values,
// so the highest-ranked story (index 0) gets the largest, top-left tile.
function treemap(data, width, height) {
  const total = data.reduce((a, b) => a + b, 0) || 1;
  // Scale values so their sum equals the available pixel area.
  const scale = (width * height) / total;
  const items = data.map((value, index) => ({ index, area: value * scale }));

  const result = new Array(data.length);

  // Worst aspect ratio of a row given the side length it is laid along.
  function worst(row, side) {
    if (row.length === 0) return Infinity;
    const sum = row.reduce((a, r) => a + r.area, 0);
    const max = Math.max(...row.map(r => r.area));
    const min = Math.min(...row.map(r => r.area));
    const s2 = sum * sum;
    const side2 = side * side;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  }

  // Place a finished row of tiles inside the current free rectangle.
  function layoutRow(row, rect) {
    const sum = row.reduce((a, r) => a + r.area, 0);
    const horizontal = rect.w >= rect.h;
    if (horizontal) {
      const rowW = sum / rect.h;
      let y = rect.y;
      for (const r of row) {
        const h = r.area / rowW;
        result[r.index] = { x: rect.x, y, w: rowW, h };
        y += h;
      }
      rect.x += rowW;
      rect.w -= rowW;
    } else {
      const rowH = sum / rect.w;
      let x = rect.x;
      for (const r of row) {
        const w = r.area / rowH;
        result[r.index] = { x, y: rect.y, w, h: rowH };
        x += w;
      }
      rect.y += rowH;
      rect.h -= rowH;
    }
  }

  const rect = { x: 0, y: 0, w: width, h: height };
  let row = [];
  let i = 0;
  while (i < items.length) {
    const side = Math.min(rect.w, rect.h);
    const next = items[i];
    if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      i++;
    } else {
      layoutRow(row, rect);
      row = [];
    }
  }
  if (row.length > 0) layoutRow(row, rect);

  return result;
}

// Auto-size text to fit its own box. Binary-searches for the largest font
// size whose content does not overflow the element, and only ever applies a
// size that has been verified to fit (so it never clips at the size cap).
function autoSizeText(element) {
  if (element.clientWidth === 0 || element.clientHeight === 0) return;

  // Low floor so long headlines in very small tiles can shrink enough to fit
  // instead of being clipped by the card's overflow:hidden.
  const minSize = 5;
  const maxSize = 84;  // Allows text to grow large in spacious cards

  const fits = (size) => {
    element.style.fontSize = size + 'px';
    return element.scrollWidth <= element.clientWidth &&
           element.scrollHeight <= element.clientHeight;
  };

  // Largest size that fits, found by binary search. Falls back to minSize when
  // even the smallest size overflows (truly unavoidable clipping).
  let lo = minSize;
  let hi = maxSize;
  let best = minSize;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  element.style.fontSize = best + 'px';
}

const NewsAggregator = ({ articles, visibleCategories, setVisibleCategories, showFooter = true }) => {
  const [layout, setLayout] = useState([]);
  const containerRef = useRef(null);

  const categoryColors = {
    us: '#3D5A72',
    world: '#5A7A8C',
    business: '#4A6A4F',
    technology: '#6B5A8A',
    entertainment: '#A85578',
    sports: '#B36844',
    science: '#3A8C89',
    health: '#A84646'
  };

  // Filter and sort articles by RSS ranking score (highest to lowest)
  const visibleArticles = useMemo(() => {
    let filtered = articles.filter(article => visibleCategories[article.category]);
    return filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [articles, visibleCategories]);

  // Calculate layout
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Descending sizes: biggest top-left to smallest bottom-right
    const values = Array.from({length: visibleArticles.length}, (_, i) => visibleArticles.length - i);
    const newLayout = treemap(values, width, height);
    setLayout(newLayout);
  }, [visibleArticles]);

  // Auto-size text to fit each card. A ResizeObserver re-fits a headline
  // whenever its card's box actually changes size (e.g. when toggling
  // categories re-lays out the treemap). This fires after the browser has
  // committed the new dimensions, so measurements are never stale — unlike a
  // plain effect that can read old sizes mid-update.
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        autoSizeText(entry.target);
      }
    });
    document.querySelectorAll('.news-headline').forEach(element => {
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [layout]);

  const handleCategoryToggle = (category) => {
    setVisibleCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleCardClick = (link) => {
    if (link) window.open(link, '_blank');
  };

  const formatCategoryName = (category) => {
    if (category === 'us') return 'U.S.';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="news-aggregator">
      <header className="header">
        <h1>News Aggregator</h1>
        <span className="article-count">Today's Top Headlines</span>
      </header>

      <div className="container" ref={containerRef}>
        {visibleArticles.map((article, idx) => {
          const layoutItem = layout[idx];
          if (!layoutItem) return null;

          // Snap edges (not dimensions) so neighboring tiles share the exact
          // same rounded coordinate. This prevents 1px gaps where the dark
          // container background would otherwise show through.
          const left = Math.round(layoutItem.x);
          const top = Math.round(layoutItem.y);
          const right = Math.round(layoutItem.x + layoutItem.w);
          const bottom = Math.round(layoutItem.y + layoutItem.h);

          return (
            <div
              key={article.id}
              className="news-card"
              style={{
                position: 'absolute',
                left: left + 'px',
                top: top + 'px',
                width: (right - left) + 'px',
                height: (bottom - top) + 'px',
                backgroundColor: categoryColors[article.category],
                cursor: 'pointer'
              }}
              onClick={() => handleCardClick(article.link)}
            >
              <h2 className="news-headline">{article.title}</h2>
              <div className="news-source">{article.source}</div>
            </div>
          );
        })}
      </div>

      <footer className="footer">
        <div className="category-filters">
          {Object.keys(categoryColors).map(category => (
            <label key={category} className="filter-label">
              <input
                type="checkbox"
                checked={visibleCategories[category]}
                onChange={() => handleCategoryToggle(category)}
                className="filter-checkbox"
              />
              <span>{formatCategoryName(category)}</span>
            </label>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default NewsAggregator;
