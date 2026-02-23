const axios = require('axios');
const Management = require('../models/Management');

/**
 * Discord Webhook Service for Felicity Event Management System
 * 
 * Sends notifications to organizer Discord channels when:
 * - A participant registers for their event
 * - A registration is cancelled
 * - An event is about to start
 */

const COLORS = {
    success: 0x22c55e,   // green
    info: 0x667eea,      // brand blue
    warning: 0xf59e0b,   // amber
    error: 0xef4444,     // red
};

/**
 * Send a Discord webhook message
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} embed - Discord embed object
 */
const sendDiscordMessage = async (webhookUrl, embed) => {
    if (!webhookUrl) return null;

    try {
        const response = await axios.post(webhookUrl, {
            embeds: [embed],
        });
        console.log('🔔 Discord notification sent');
        return response.data;
    } catch (error) {
        console.error('❌ Discord webhook error:', error.message);
        return null;
    }
};

/**
 * Notify organizer on new event registration
 */
const notifyNewRegistration = async ({ organizerId, eventName, participantName, participantEmail, eventType, merchandiseDetails }) => {
    try {
        const organizer = await Management.findById(organizerId);
        if (!organizer?.discordWebhookUrl || organizer.notifyOnRegistration === false) {
            return null;
        }

        const fields = [
            { name: '👤 Participant', value: participantName || 'Unknown', inline: true },
            { name: '📧 Email', value: participantEmail || 'N/A', inline: true },
            { name: '🎫 Event Type', value: eventType || 'normal', inline: true },
        ];

        if (merchandiseDetails) {
            fields.push({ 
                name: '🛍️ Merchandise', 
                value: `${merchandiseDetails.itemName} (×${merchandiseDetails.quantity}) — ₹${merchandiseDetails.totalAmount}`, 
                inline: false 
            });
        }

        return sendDiscordMessage(organizer.discordWebhookUrl, {
            title: `🎟️ New Registration: ${eventName}`,
            description: `A new participant has registered for your event!`,
            color: COLORS.success,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: 'Felicity Event Management System' },
        });
    } catch (error) {
        console.error('Discord notify registration error:', error.message);
        return null;
    }
};

/**
 * Notify organizer when a registration is cancelled
 */
const notifyRegistrationCancelled = async ({ organizerId, eventName, participantName, participantEmail }) => {
    try {
        const organizer = await Management.findById(organizerId);
        if (!organizer?.discordWebhookUrl || organizer.notifyOnCancellation === false) {
            return null;
        }

        return sendDiscordMessage(organizer.discordWebhookUrl, {
            title: `❌ Registration Cancelled: ${eventName}`,
            description: `A participant has cancelled their registration.`,
            color: COLORS.error,
            fields: [
                { name: '👤 Participant', value: participantName || 'Unknown', inline: true },
                { name: '📧 Email', value: participantEmail || 'N/A', inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Felicity Event Management System' },
        });
    } catch (error) {
        console.error('Discord notify cancellation error:', error.message);
        return null;
    }
};

/**
 * Notify organizer when event is about to start (for cron/manual trigger)
 */
const notifyEventStarting = async ({ organizerId, eventName, startDate, venue }) => {
    try {
        const organizer = await Management.findById(organizerId);
        if (!organizer?.discordWebhookUrl || organizer.notifyOnEventStart === false) {
            return null;
        }

        return sendDiscordMessage(organizer.discordWebhookUrl, {
            title: `⏰ Event Starting Soon: ${eventName}`,
            description: `Your event is about to begin!`,
            color: COLORS.warning,
            fields: [
                { name: '📅 Start Time', value: new Date(startDate).toLocaleString(), inline: true },
                { name: '📍 Venue', value: venue || 'TBD', inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Felicity Event Management System' },
        });
    } catch (error) {
        console.error('Discord notify event start error:', error.message);
        return null;
    }
};

/**
 * Notify organizer's Discord when a new event is published
 */
const notifyEventPublished = async ({ organizerId, eventName, eventType, startDate, venue, description }) => {
    try {
        const organizer = await Management.findById(organizerId);
        if (!organizer?.discordWebhookUrl) {
            return null;
        }

        return sendDiscordMessage(organizer.discordWebhookUrl, {
            title: `🎉 New Event Published: ${eventName}`,
            description: description ? description.substring(0, 200) + '...' : 'A new event has been published!',
            color: COLORS.info,
            fields: [
                { name: '🎫 Type', value: eventType || 'normal', inline: true },
                { name: '📅 Start Date', value: startDate ? new Date(startDate).toLocaleString() : 'TBD', inline: true },
                { name: '📍 Venue', value: venue || 'TBD', inline: true },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'Felicity Event Management System' },
        });
    } catch (error) {
        console.error('Discord notify event published error:', error.message);
        return null;
    }
};

module.exports = {
    sendDiscordMessage,
    notifyNewRegistration,
    notifyRegistrationCancelled,
    notifyEventStarting,
    notifyEventPublished,
};
