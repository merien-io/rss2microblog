// src/contentPrep.js

const axios = require('axios');
const cheerio = require('cheerio');

class ContentPrep {
  async extractMetadata(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      return {
        title: $('meta[property="og:title"]').attr('content') || 
               $('title').text(),
        description: $('meta[property="og:description"]').attr('content') || 
                    $('meta[name="description"]').attr('content'),
        image: $('meta[property="og:image"]').attr('content') || 
               $('meta[name="twitter:image"]').attr('content'),
        imageAlt: $('meta[property="og:image:alt"]').attr('content') || 
                  $('meta[name="twitter:image:alt"]').attr('content'),
        url: url
      };
    } catch (error) {
      console.error(`Error extracting metadata from ${url}:`, error);
      return null;
    }
  }

  preparePost(item, metadata) {
    return {
      text: `${item.title}\n\n${item.link}`,
      card: {
        url: item.link,
        title: metadata?.title || item.title,
        description: metadata?.description,
        imageUrl: metadata?.image,
        // Also map it in your preparePost method (if you use this method anywhere):
        imageAlt: metadata?.imageAlt
      }
    };
  }
}

module.exports = new ContentPrep();