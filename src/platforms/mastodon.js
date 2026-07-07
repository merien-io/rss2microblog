// src/platforms/mastodon.js
const axios = require('axios');
const FormData = require('form-data');

async function postToMastodon(text, cardData, settings) {
  try {
    const baseUrl = `https://${settings.instance}`;
    const headers = {
      'Authorization': `Bearer ${settings.accessToken}`
    };

    let mediaIds = [];
    
    // If we have an image, upload it first using the v2 media endpoint
    if (cardData.imageUrl) {
      try {
        console.log('Downloading image from:', cardData.imageUrl);
        const imageResponse = await axios.get(cardData.imageUrl, { 
          responseType: 'arraybuffer',
          maxContentLength: 10 * 1024 * 1024 // 10MB limit for safety
        });
        
        const formData = new FormData();
        // form-data requires a filename when passing a raw Buffer
        formData.append('file', imageResponse.data, {
          filename: 'image.jpg', 
          contentType: imageResponse.headers['content-type'] || 'image/jpeg'
        });
        
        if (cardData.imageAlt) {
          formData.append('description', cardData.imageAlt);
        } else if (cardData.title) {
          // Fallback to title if no alt text is available
          formData.append('description', cardData.title); 
        }
        
        console.log('Uploading media to Mastodon...');
        const mediaResponse = await axios.post(`${baseUrl}/api/v2/media`, formData, {
          headers: {
            ...headers,
            ...formData.getHeaders()
          }
        });
        
        // Mastodon's v2 media endpoint might process asynchronously (HTTP 202)
        if (mediaResponse.status === 202) {
          console.log('Waiting 5 seconds for media processing...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        if (mediaResponse.data && mediaResponse.data.id) {
          mediaIds.push(mediaResponse.data.id);
          console.log('Media uploaded successfully:', mediaResponse.data.id);
        }
      } catch (imageError) {
        console.error('Error uploading image to Mastodon:', imageError.response?.data || imageError.message);
      }
    }

    // Prepare post text (Mastodon has a 500 character limit)
    const truncatedText = text.length > 500 ? text.substring(0, 497) + '...' : text;

    const postData = {
      status: truncatedText,
      visibility: settings.visibility || 'public'
    };

    if (mediaIds.length > 0) {
      postData.media_ids = mediaIds;
    }

    console.log('Posting to Mastodon...');
    const result = await axios.post(`${baseUrl}/api/v1/statuses`, postData, {
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    });
    
    return result.data;

  } catch (error) {
    console.error('Error in postToMastodon:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = postToMastodon;