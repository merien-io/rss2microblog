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
      
      // Sort newest first
      const recentItems = items
        .sort((a, b) => b.pubDate - a.pubDate)
        .slice(0, 30);

      // Safe limit: Max 2 posts per platform per interval
      const MAX_POSTS_PER_INTERVAL = 2;
      
      // Track posts count per platform individually
      let postsThisInterval = {};
      feed.platforms.forEach(p => postsThisInterval[p] = 0);

      for (const item of recentItems) {
        for (const platformId of feed.platforms) {
          // Skip if already posted or marked as skipped
          if (await db.isPosted(feedId, item.guid, platformId)) {
            continue;
          }

          // If we already hit the safe limit of 2 for this platform,
          // mark this older item as 'skipped' so it never gets posted.
          if (postsThisInterval[platformId] >= MAX_POSTS_PER_INTERVAL) {
            console.log(`Skipping older item ${item.guid} on ${platformId} to prevent backlog spam`);
            await db.recordPost(feedId, item, platformId, { id: 'skipped-backlog' });
            continue;
          }

          try {
            const metadata = await contentPrep.extractMetadata(item.link);
            const text = `${item.title}\n\n${item.link}`;
            const cardData = {
              url: item.link,
              title: metadata?.title || item.title,
              description: metadata?.description,
              imageUrl: metadata?.image,
              imageAlt: metadata?.imageAlt
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
              postsThisInterval[platformId]++;
            }
            
            // Add delay between posts to prevent immediate rate-limits
            await new Promise(resolve => setTimeout(resolve, 2000));

          } catch (error) {
            console.error(`Error posting item ${item.guid} to ${platformId}:`, error);
          }
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