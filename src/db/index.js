// src/db/index.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = './data/posts.db';
let db = null; // Declare db variable at module level

async function initDb() {
  if (!db) {
    // Ensure the data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS posted_items (
        id INTEGER PRIMARY KEY,
        feed_id TEXT NOT NULL,
        item_guid TEXT NOT NULL,
        item_url TEXT NOT NULL,
        published_at DATETIME NOT NULL,
        posted_at DATETIME NOT NULL,
        platforms JSON NOT NULL,
        UNIQUE(feed_id, item_guid)
      );
    `);
  }
  return db;
}

async function cleanupOldPosts(feedId, keepCount = 50) {
  const db = await initDb();
  await db.run(`
    DELETE FROM posted_items 
    WHERE feed_id = ? AND id NOT IN (
      SELECT id FROM posted_items 
      WHERE feed_id = ? 
      ORDER BY posted_at DESC 
      LIMIT ?
    )
  `, [feedId, feedId, keepCount]);
}

async function recordPost(feedId, item, platform, postResult) {
  const db = await initDb();
  const platforms = {};
  platforms[platform] = {
    posted_at: new Date().toISOString(),
    post_id: postResult.id,
    status: 'success'
  };

  await db.run(
    `INSERT INTO posted_items (feed_id, item_guid, item_url, published_at, posted_at, platforms)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(feed_id, item_guid) DO UPDATE SET
     platforms = json_patch(platforms, ?)`,
    [
      feedId,
      item.guid,
      item.link,
      item.pubDate,
      new Date().toISOString(),
      JSON.stringify(platforms),
      JSON.stringify(platforms)
    ]
  );

  await cleanupOldPosts(feedId);
}

async function isPosted(feedId, guid, platform) {
  const db = await initDb();
  const result = await db.get(
    `SELECT platforms FROM posted_items 
     WHERE feed_id = ? AND item_guid = ?`,
    [feedId, guid]
  );
  
  if (!result) return false;
  const platforms = JSON.parse(result.platforms);
  return !!platforms[platform];
}

module.exports = { initDb, recordPost, isPosted };