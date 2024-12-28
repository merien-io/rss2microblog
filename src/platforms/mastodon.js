// src/platforms/mastodon.js
const Mastodon = require('mastodon-api');
const axios = require('axios');

async function postToMastodon(text, cardData, settings) {
  try {
    const mastodon = new Mastodon({
      access_token: settings.accessToken,
      api_url: `https://${settings.instance}/api/v1/`
    });

    let mediaIds = [];
    
    // If we have an image, upload it first
    if (cardData.imageUrl) {
      try {
        console.log('Downloading image from:', cardData.imageUrl);
        const imageResponse = await axios.get(cardData.imageUrl, { 
          responseType: 'arraybuffer' 
        });
        
        // Create form data for media upload
        const form_data = new FormData();
        const blob = new Blob([imageResponse.data], { type: 'image/jpeg' });
        form_data.append('file', blob);
        
        console.log('Uploading media to Mastodon...');
        const mediaResponse = await mastodon.post('media', {
          file: imageResponse.data,
          description: cardData.title || ''
        });
        
        // Wait for media to be processed
        console.log('Waiting for media processing...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (mediaResponse.data.id) {
          mediaIds.push(mediaResponse.data.id);
          console.log('Media uploaded successfully:', mediaResponse.data.id);
        }
      } catch (imageError) {
        console.error('Error uploading image to Mastodon:', imageError);
      }
    }

    // Prepare post text (Mastodon has 500 char limit)
    const truncatedText = text.length > 500 ? text.substring(0, 497) + '...' : text;

    const postData = {
      status: truncatedText,
      visibility: settings.visibility || 'public'
    };

    if (mediaIds.length > 0) {
      postData.media_ids = mediaIds;
    }

    console.log('Posting to Mastodon with data:', postData);
    const result = await mastodon.post('statuses', postData);
    
    if (result.data.error) {
      throw new Error(result.data.error);
    }
    
    return result.data;

  } catch (error) {
    console.error('Error in postToMastodon:', error);
    throw error;
  }
}

module.exports = postToMastodon;