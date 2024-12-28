
# RSS to Social Media Crosspost

A Node.js application that automatically crossposts RSS feed items to multiple social media platforms (Bluesky, Threads, and Mastodon) with image and metadata support.

## Features

- Multi-platform support: Bluesky, Threads, and Mastodon
- Image optimization and processing
- Link preview cards with metadata
- Duplicate post prevention
- Configurable posting intervals
- SQLite database for post tracking
- Environment variable based configuration
- YAML-based feed configuration

## Prerequisites

- Node.js 16.x or higher
- NPM or Yarn
- SQLite3

## Installation

1. Clone the repository:
```bash
git clone https://github.com/merien-io/rss2microblog.git
cd rss2microblog
```

2. Install dependencies:
```bash
npm install
```

3. Create required directories:
```bash
mkdir -p data
```

4. Create configuration files:
```bash
cp config/feeds.yml.example config/feeds.yml
cp .env.example .env
```

## Configuration

### Environment Variables

Create a `.env` file with your platform credentials:

```env
# Bluesky Credentials
BLUESKY_IDENTIFIER=your.handle@bsky.social
BLUESKY_PASSWORD=your-app-password

# Threads Credentials
THREADS_ACCESS_TOKEN=your-threads-token

# Mastodon Credentials
MASTODON_INSTANCE=mastodon.social
MASTODON_ACCESS_TOKEN=your-mastodon-token
```

### Platform-Specific Setup

#### Bluesky
1. Create an account on [Bluesky](https://bsky.app)
2. Generate an app password in your account settings
3. Use your handle and app password in the configuration

#### Threads
1. Log into your Facebook Developer account
2. Visit [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
3. Make sure you're also logged into the Threads/Instagram account you want to post from
4. Generate a token with the required permissions
5. Use this token in your configuration

#### Mastodon
1. Create an account on your preferred Mastodon instance
2. Go to Settings > Development
3. Create a new application
4. Copy the access token to your configuration

### Feed Configuration

Configure your feeds in `config/feeds.yml`:

```yaml
feeds:
  my_feed:
    url: https://example.com/feed.xml
    platforms:
      - bluesky
      - threads
      - mastodon
    settings:
      bluesky:
        identifier: ${BLUESKY_IDENTIFIER}
        password: ${BLUESKY_PASSWORD}
      threads:
        accessToken: ${THREADS_ACCESS_TOKEN}
      mastodon:
        instance: ${MASTODON_INSTANCE}
        accessToken: ${MASTODON_ACCESS_TOKEN}
        visibility: public
```

## Usage

Start the application:

```bash
npm start
```

The application will:
- Run immediately upon startup
- Check feeds every 15 minutes
- Process up to 8 new posts per feed per interval
- Optimize images for each platform
- Create link preview cards where supported
- Track posted items to prevent duplicates

## Database

The application uses SQLite databases for:
- Tracking posted items (`data/posts.db`)
- Managing Threads tokens (`data/threads_tokens.db`)

## Error Handling

- Failed posts are logged but don't stop the application
- Image processing failures fallback to text-only posts
- Platform API errors are caught and logged

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 merien b.v.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Support

For issues and feature requests, please use the GitHub issue tracker.