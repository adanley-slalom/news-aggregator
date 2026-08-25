// Paywall filter module for news aggregator
// Used by both api/news.js and server/server.js

// List of known paywalled publishers (lowercase for case-insensitive matching)
const PAYWALLED_PUBLISHERS = [
  'the athletic',
  'barron\'s',
  'bloomberg',
  'boston globe',
  'business insider',
  'consumer reports',
  'financial times',
  'foreign policy',
  'harvard business review',
  'the economist',
  'the information',
  'the new york times',
  'new yorker',
  'the atlantic',
  'the times',
  'the wall street journal',
  'wall street journal',
  'washington post',
  'wired',
  'los angeles times',
  'statnews'
];

/**
 * Check if a source name matches any known paywalled publisher.
 * Case-insensitive substring match.
 * @param {string} sourceName - The publisher name from the RSS feed
 * @returns {boolean} - True if the source is paywalled
 */
function isPaywalledSource(sourceName) {
  if (!sourceName || typeof sourceName !== 'string') {
    return false;
  }
  const lowerSource = sourceName.toLowerCase();
  return PAYWALLED_PUBLISHERS.some(publisher => lowerSource.includes(publisher));
}

module.exports = {
  PAYWALLED_PUBLISHERS,
  isPaywalledSource
};
