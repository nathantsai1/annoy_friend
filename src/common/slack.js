const fetch = require('node-fetch');

// Send a Slack message (manual or AI)
async function sendSlackMessage({ token, channel, text, reactions }) {
    try {
        // Send the message
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                channel,
                text
            })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error);

        // Optionally add reactions
        if (reactions && reactions.length > 0) {
            for (const reaction of reactions) {
                await fetch('https://slack.com/api/reactions.add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        channel,
                        name: reaction,
                        timestamp: data.ts
                    })
                });
            }
        }
        return true;
    } catch (e) {
        console.error('Error sending Slack message:', e);
        return false;
    }
}

module.exports = { sendSlackMessage };