// src/contentPrep.js

const axios = require('axios');
const cheerio = require('cheerio');

class ContentPrep {
  async extractMetadata(url) {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // 1. Extract custom og:hashtags (with a fallback to name="hashtags")
      const customVal = $('meta[property="og:hashtags"]').attr('content') || 
                        $('meta[name="hashtags"]').attr('content') || '';
      const ogHashtags = customVal ? customVal.split(',').map(s => s.trim()) : [];

      // 2. Extract standard article tags
      const articleTags = [];
      $('meta[property="article:tag"]').each((i, el) => {
        const val = $(el).attr('content');
        if (val) articleTags.push(val);
      });

      // 3. Extract fallback keywords
      const keywordsVal = $('meta[name="keywords"]').attr('content') || '';
      const keywords = keywordsVal ? keywordsVal.split(',').map(s => s.trim()) : [];

      return {
        title: $('meta[property="og:title"]').attr('content') || 
               $('title').text(),
        description: $('meta[property="og:description"]').attr('content') || 
                    $('meta[name="description"]').attr('content'),
        image: $('meta[property="og:image"]').attr('content') || 
               $('meta[name="twitter:image"]').attr('content'),
        imageAlt: $('meta[property="og:image:alt"]').attr('content') || 
                  $('meta[name="twitter:image:alt"]').attr('content'),
        url: url,
        // Expose extracted data to the preparePost method
        ogHashtags,
        articleTags,
        keywords
      };
    } catch (error) {
      console.error(`Error extracting metadata from ${url}:`, error);
      return null;
    }
  }

  formatHashtags(tagsArray) {
    if (!tagsArray || !Array.isArray(tagsArray)) return '';
    return tagsArray
      .map(tag => {
        // Remove special characters, preserving spaces and hyphens temporarily for word boundaries
        let clean = tag.replace(/[^a-zA-Z0-9\s-]/g, '');
        // Convert to PascalCase (e.g., "social media" -> "SocialMedia")
        clean = clean
          .split(/[\s-]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
        return clean ? `#${clean}` : '';
      })
      .filter(tag => tag.length > 1) // Remove empty outputs
      .join(' ');
  }

  preparePost(item, metadata, maxTags = 0) {
    let finalTagsString = '';

    // Only process tags if maxTags is specified as a positive number
    if (metadata && typeof maxTags === 'number' && maxTags > 0) {
      let selectedTags = [];

      // Strict priority checks:
      if (metadata.ogHashtags && metadata.ogHashtags.length > 0) {
        // 1. og:hashtags found -> use and ignore the rest
        selectedTags = metadata.ogHashtags;
      } else if (metadata.articleTags && metadata.articleTags.length > 0) {
        // 2. article:tag found -> use and ignore keywords
        selectedTags = metadata.articleTags;
      } else if (metadata.keywords && metadata.keywords.length > 0) {
        // 3. Fallback to keywords
        selectedTags = metadata.keywords;
      }

      if (selectedTags.length > 0) {
        const limitedTags = selectedTags.slice(0, maxTags);
        finalTagsString = this.formatHashtags(limitedTags);
      }
    }

    const postText = finalTagsString
      ? `${item.title}\n\n${item.link}\n\n${finalTagsString}`
      : `${item.title}\n\n${item.link}`;

    return {
      text: postText,
      card: {
        url: item.link,
        title: metadata?.title || item.title,
        description: metadata?.description,
        imageUrl: metadata?.image,
        imageAlt: metadata?.imageAlt
      }
    };
  }
}

module.exports = new ContentPrep();