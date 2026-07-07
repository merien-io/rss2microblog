// src/feedHandler.js
const axios = require('axios');
const { parseString } = require('xml2js');
const { promisify } = require('util');
const parseXml = promisify(parseString);

class FeedHandler {
  async fetchFeed(feedUrl) {
    try {
      const response = await axios.get(feedUrl);
      const result = await parseXml(response.data);
      
      // Valideer of er wel items in de feed zitten
      if (!result || !result.rss || !result.rss.channel || !result.rss.channel[0].item) {
        console.warn(`Geen items gevonden in feed: ${feedUrl}`);
        return [];
      }
      
      return this.normalizeItems(result.rss.channel[0].item);
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error.message);
      throw error;
    }
  }

  normalizeItems(items) {
    return items.map(item => ({
      // Als er geen guid is, gebruik dan de link als unieke ID
      guid: item.guid ? item.guid[0] : (item.link ? item.link[0] : Math.random().toString()),
      title: item.title ? item.title[0] : 'Zonder titel',
      link: item.link ? item.link[0] : '',
      pubDate: item.pubDate ? new Date(item.pubDate[0]) : new Date(),
      description: item.description ? item.description[0] : null
    }));
  }
}

module.exports = new FeedHandler();