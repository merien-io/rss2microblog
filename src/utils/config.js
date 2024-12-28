// src/utils/config.js
const yaml = require('js-yaml');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

function loadConfig() {
  try {
    const configFile = fs.readFileSync('./config/feeds.yml', 'utf8');
    const interpolatedConfig = configFile.replace(/\${(\w+)}/g, (_, envVar) => {
      if (!process.env[envVar]) {
        throw new Error(`Missing environment variable: ${envVar}`);
      }
      return process.env[envVar];
    });
    return yaml.load(interpolatedConfig);
  } catch (e) {
    console.error('Error loading config:', e);
    process.exit(1);
  }
}

module.exports = loadConfig();