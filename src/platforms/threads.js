// src/platforms/threads.js
const axios = require('axios');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

class ThreadsAPI {
  constructor(accessToken, feedId) {
    this.accessToken = accessToken;
    this.feedId = feedId;
    this.dbPath = path.join(process.cwd(), 'data', 'threads_tokens.db');
    this.api = axios.create({
      baseURL: 'https://graph.threads.net/v1.0',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initDb() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS threads_tokens (
        feed_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        last_refresh INTEGER NOT NULL
      );
    `);

    return db;
  }

  async refreshToken(token) {
    try {
      const response = await axios.get('https://graph.threads.net/refresh_access_token', {
        params: {
          grant_type: 'th_refresh_token',
          access_token: token
        }
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  async getValidToken() {
    const db = await this.initDb();
    let tokenRow = await db.get('SELECT * FROM threads_tokens WHERE feed_id = ?', [this.feedId]);
    const now = Date.now();

    if (!tokenRow) {
      // First time - store the token for this feed
      await db.run(
        'INSERT INTO threads_tokens (feed_id, access_token, last_refresh) VALUES (?, ?, ?)',
        [this.feedId, this.accessToken, now]
      );
      return this.accessToken;
    }

    // If token is older than 100 hours, try to refresh
    if (now - tokenRow.last_refresh > 100 * 60 * 60 * 1000) {
      const newToken = await this.refreshToken(tokenRow.access_token);
      if (newToken) {
        await db.run(
          'UPDATE threads_tokens SET access_token = ?, last_refresh = ? WHERE feed_id = ?',
          [newToken, now, this.feedId]
        );
        return newToken;
      }
    }

    return tokenRow.access_token;
  }

  async createPost(userId, text, url) {
    try {
      const token = await this.getValidToken();
      
      // Step 1: Create the media container
      console.log(`Attempting to create container for user ID: ${userId}`);
      const createResponse = await this.api.post(
        `/${userId}/threads`,
        null,
        {
          params: {
            media_type: 'TEXT',
            text: text,
            link_attachment: url,
            access_token: token
          }
        }
      );

      console.log('Create response:', createResponse.data);
      const mediaContainerId = createResponse.data.id;
      console.log('Media container created:', mediaContainerId);

      // Wait for processing
      console.log('Waiting 30 seconds for processing...');
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Step 2: Publish the container
      console.log('Attempting to publish...');
      const publishResponse = await this.api.post(
        `/${userId}/threads_publish`,
        null,
        {
          params: {
            creation_id: mediaContainerId,
            access_token: token
          }
        }
      );

      console.log('Post published successfully:', publishResponse.data);
      return publishResponse.data;

    } catch (error) {
      console.error('Error posting to Threads:', error);
      throw error;
    }
  }

  async getUserId() {
    try {
      const token = await this.getValidToken();
      const response = await this.api.get('/me', {
        params: { access_token: token }
      });
      return response.data.id;
    } catch (error) {
      console.error('Error getting Threads user ID:', error);
      throw error;
    }
  }
}

async function postToThreads(text, cardData, settings, feedId) {
  try {
    const threadsApi = new ThreadsAPI(settings.accessToken, feedId);
    const userId = await threadsApi.getUserId();
    
    const truncatedText = text.length > 300 ? text.substring(0, 297) + '...' : text;
    
    const result = await threadsApi.createPost(
      userId,
      truncatedText,
      cardData.url
    );

    return result;
  } catch (error) {
    console.error('Error in postToThreads:', error);
    throw error;
  }
}

module.exports = postToThreads;