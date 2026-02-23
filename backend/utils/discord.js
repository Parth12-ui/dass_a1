/**
 * Post an event announcement to a Discord channel via webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} eventData - Event details
 */
const postEventToDiscord = async (webhookUrl, eventData) => {
    if (!webhookUrl) return;

    const { name, description, type, startDate, endDate, registrationFee, tags } = eventData;

    const embed = {
        embeds: [
            {
                title: `🎉 New Event: ${name}`,
                description: description || 'No description provided.',
                color: type === 'merchandise' ? 0xff9900 : 0x5865f2,
                fields: [
                    { name: 'Type', value: type, inline: true },
                    { name: 'Fee', value: registrationFee > 0 ? `₹${registrationFee}` : 'Free', inline: true },
                    { name: 'Start', value: new Date(startDate).toLocaleDateString(), inline: true },
                    { name: 'End', value: new Date(endDate).toLocaleDateString(), inline: true },
                    ...(tags && tags.length > 0 ? [{ name: 'Tags', value: tags.join(', ') }] : []),
                ],
                timestamp: new Date().toISOString(),
            },
        ],
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embed),
        });
        if (!response.ok) {
            console.error('Discord webhook failed:', response.status, await response.text());
        }
    } catch (err) {
        console.error('Discord webhook error:', err.message);
    }
};

module.exports = { postEventToDiscord };
