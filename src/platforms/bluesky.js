// src/platforms/bluesky.js
const { BskyAgent, RichText } = require('@atproto/api');
const axios = require('axios');
const ImageProcessor = require('../utils/imageProcessor');

async function postToBluesky(text, cardData, settings) {
  try {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: settings.identifier,
      password: settings.password,
    });

    const richText = new RichText({ text });
    await richText.detectFacets(agent);

    let postData = {
      text: richText.text,
      facets: richText.facets,
    };

    if (cardData.imageUrl) {
      try {
        console.log('Downloading image from:', cardData.imageUrl);
        const imageResponse = await axios.get(cardData.imageUrl, { 
          responseType: 'arraybuffer',
          headers: {
            'Accept': 'image/*'
          }
        });

        const contentType = imageResponse.headers['content-type'] || 'image/jpeg';
        console.log('Image content type:', contentType);

        const buffer = Buffer.from(imageResponse.data);
        console.log('Image buffer size:', buffer.length);

        const optimizedBuffer = await ImageProcessor.optimizeImage(buffer);
        console.log('Optimized buffer size:', optimizedBuffer.length);

        const uploadResult = await agent.uploadBlob(optimizedBuffer, {
          encoding: 'image/jpeg',
        });

        console.log('Upload result:', uploadResult);

        if (uploadResult && uploadResult.data && uploadResult.data.blob) {
          postData.embed = {
            $type: 'app.bsky.embed.external',
            external: {
              uri: cardData.url,
              title: cardData.title || '',
              description: cardData.description || '',
              thumb: uploadResult.data.blob
            }
          };
        } else {
          throw new Error('Upload result missing blob data');
        }

      } catch (imageError) {
        console.error('Error processing image:', imageError);
        postData.embed = {
          $type: 'app.bsky.embed.external',
          external: {
            uri: cardData.url,
            title: cardData.title || '',
            description: cardData.description || ''
          }
        };
      }
    } else {
      postData.embed = {
        $type: 'app.bsky.embed.external',
        external: {
          uri: cardData.url,
          title: cardData.title || '',
          description: cardData.description || ''
        }
      };
    }

    const result = await agent.post(postData);
    return result;

  } catch (error) {
    console.error('Error in postToBluesky:', error);
    throw error;
  }
}

module.exports = postToBluesky;