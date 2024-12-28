// src/index.js
const config = require('./utils/config');
const feedHandler = require('./feedHandler');
const contentPrep = require('./contentPrep');
const postToBluesky = require('./platforms/bluesky');
const postToThreads = require('./platforms/threads');
const postToMastodon = require('./platforms/mastodon');
const db = require('./db');

async function processFeeds() {
  for (const [feedId, feed] of Object.entries(config.feeds)) {
    try {
      console.log(`Processing feed: ${feedId}`);
      const items = await feedHandler.fetchFeed(feed.url);
      
      // Take only the 30 most recent items
      const recentItems = items
        .sort((a, b) => b.pubDate - a.pubDate)
        .slice(0, 30);

      let postsThisInterval = 0;
      const MAX_POSTS_PER_INTERVAL = 8;

      for (const item of recentItems) {
        if (postsThisInterval >= MAX_POSTS_PER_INTERVAL) {
          console.log(`Reached maximum posts (${MAX_POSTS_PER_INTERVAL}) for feed ${feedId} this interval`);
          break;
        }

        for (const platformId of feed.platforms) {
          // Skip if already posted
          if (await db.isPosted(feedId, item.guid, platformId)) {
            continue;
          }

          try {
            const metadata = await contentPrep.extractMetadata(item.link);
            const text = `${item.title}\n\n${item.link}`;
            const cardData = {
              url: item.link,
              title: metadata?.title || item.title,
              description: metadata?.description,
              imageUrl: metadata?.image
            };

            let result;
            console.log(`Posting item ${item.guid} to ${platformId}`);  
            if (platformId === 'bluesky') {
              result = await postToBluesky(text, cardData, feed.settings.bluesky);
            }
           else if (platformId === 'mastodon') {
            result = await postToMastodon(text, cardData, feed.settings.mastodon);
          }
            else if (platformId === 'threads') {
              result = await postToThreads(text, cardData, feed.settings.threads, feedId);
            }

            if (result) {
              await db.recordPost(feedId, item, platformId, result);
              postsThisInterval++;
            }
            
            // Add delay between posts
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            console.error(`Error posting item ${item.guid} to ${platformId}:`, error);
          }
        }

        if (postsThisInterval >= MAX_POSTS_PER_INTERVAL) {
          break;
        }
      }
    } catch (error) {
      console.error(`Error processing feed ${feedId}:`, error);
    }
  }
}

// Run immediately and then every 15 minutes
processFeeds();
setInterval(processFeeds, 15 * 60 * 1000);