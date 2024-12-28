// testmast.js
require('dotenv').config();
const postToMastodon = require('./src/platforms/mastodon');

async function testPost() {
    const settings = {
        instance: process.env.MASTODON_INSTANCE,
        accessToken: process.env.MASTODON_ACCESS_TOKEN,
        visibility: 'public'
    };

    const text = "Test post from Node.js " + new Date().toISOString();
    const cardData = {
        url: 'https://dgki.nl',
        title: 'Test Post',
        description: 'Testing our Mastodon implementation',
        imageUrl: 'https://mos.bytes.news/images/Thursday/da37970-NVIDIA-AI-chips.jpg'  // Random test image
    };

    console.log('Settings:', {
        instance: settings.instance,
        tokenPrefix: settings.accessToken.substring(0, 5) + '...',
        visibility: settings.visibility
    });

    console.log('Attempting to post:', {
        text: text,
        cardData: cardData
    });

    try {
        const result = await postToMastodon(text, cardData, settings);
        console.log('Post successful!');
        console.log('Result:', result);
    } catch (error) {
        console.error('Post failed:', error);
    }
}

testPost();