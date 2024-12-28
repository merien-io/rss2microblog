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
      return this.normalizeItems(result.rss.channel[0].item);
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error);
      throw error;
    }
  }

  normalizeItems(items) {
    return items.map(item => ({
      guid: item.guid[0],
      title: item.title[0],
      link: item.link[0],
      pubDate: new Date(item.pubDate[0]),
      description: item.description ? item.description[0] : null
    }));
  }
}

module.exports = new FeedHandler();