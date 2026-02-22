const nodemailer = require('nodemailer');

/**
 * Email Service for Felicity Event Management System
 * Uses nodemailer with SMTP transport
 * 
 * Configuration via environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * 
 * Falls back to Ethereal (test email service) if not configured.
 */

let transporter = null;

const getTransporter = async () => {
    if (transporter) return transporter;

    const host = (process.env.SMTP_HOST || '').trim();
    const port = (process.env.SMTP_PORT || '').trim();
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASS || '').trim();

    if (host && user && pass) {
        // Production SMTP (Gmail, SendGrid, Mailgun, etc.)
        transporter = nodemailer.createTransport({
            host,
            port: parseInt(port) || 587,
            secure: parseInt(port) === 465,
            auth: { user, pass },
        });
        console.log(`📧 Email service configured with SMTP: ${host}`);
    } else {
        // Fallback: Ethereal test account (emails viewable at https://ethereal.email)
        try {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            console.log(`📧 Email service using Ethereal test account: ${testAccount.user}`);
            console.log(`   View sent emails at: https://ethereal.email/login`);
            console.log(`   Login: ${testAccount.user} / ${testAccount.pass}`);
        } catch (err) {
            console.warn('⚠️  Could not create email transporter:', err.message);
            return null;
        }
    }

    return transporter;
};

const FROM_ADDRESS = () => process.env.SMTP_FROM || 'Felicity Events <noreply@felicity.iiit.ac.in>';

/**
 * Send an email. Logs preview URL when using Ethereal.
 */
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const transport = await getTransporter();
        if (!transport) {
            console.warn('⚠️  Email not sent (no transporter):', subject, '->', to);
            return null;
        }

        const info = await transport.sendMail({
            from: FROM_ADDRESS(),
            to,
            subject,
            html,
            text: text || subject,
        });

        // If using Ethereal, log the preview URL
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📧 Email preview: ${previewUrl}`);
        } else {
            console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        }

        return info;
    } catch (error) {
        console.error('❌ Email send error:', error.message);
        return null;
    }
};

/**
 * Send registration confirmation email to participant
 */
const sendRegistrationConfirmation = async (user) => {
    const { email, firstName, lastName } = user;
    return sendEmail({
        to: email,
        subject: '🎉 Welcome to Felicity Event Management System!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Welcome to Felicity! 🎊</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${firstName} ${lastName}!</h2>
                    <p>Your account has been successfully created. You can now:</p>
                    <ul>
                        <li>🎪 Browse and register for events</li>
                        <li>🏛️ Follow your favorite clubs</li>
                        <li>🎟️ Get QR tickets for events</li>
                        <li>📊 Track your event history</li>
                    </ul>
                    <p>Get started by browsing the latest events!</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Browse Events
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    });
};

/**
 * Send event registration confirmation to participant
 */
const sendEventRegistrationConfirmation = async ({ participantEmail, participantName, eventName, eventDate, venue, qrCode }) => {
    return sendEmail({
        to: participantEmail,
        subject: `🎟️ Registration Confirmed: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Registration Confirmed! ✅</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${participantName}!</h2>
                    <p>You've been successfully registered for:</p>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #667eea;">${eventName}</h3>
                        ${eventDate ? `<p>📅 <strong>Date:</strong> ${new Date(eventDate).toLocaleString()}</p>` : ''}
                        ${venue ? `<p>📍 <strong>Venue:</strong> ${venue}</p>` : ''}
                    </div>
                    ${qrCode ? `
                        <div style="text-align: center; margin: 20px 0;">
                            <p><strong>Your QR Ticket:</strong></p>
                            <img src="${qrCode}" alt="QR Ticket" style="max-width: 200px;" />
                            <p style="font-size: 12px; color: #666;">Present this QR code at the venue for entry</p>
                        </div>
                    ` : ''}
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-events" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View My Events
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    });
};

/**
 * Send event cancellation notification
 */
const sendEventCancellationEmail = async ({ participantEmail, participantName, eventName }) => {
    return sendEmail({
        to: participantEmail,
        subject: `Registration Cancelled: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #ef4444; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Registration Cancelled</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${participantName},</h2>
                    <p>Your registration for <strong>${eventName}</strong> has been cancelled.</p>
                    <p>If this was a mistake, you can re-register from the event page.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Browse Events
                        </a>
                    </div>
                </div>
            </div>
        `,
    });
};

/**
 * Send organizer account creation email
 */
const sendOrganizerCreatedEmail = async ({ email, organizerName, password }) => {
    return sendEmail({
        to: email,
        subject: '🏛️ Your Felicity Organizer Account Has Been Created',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Organizer Account Created! 🎉</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Welcome, ${organizerName}!</h2>
                    <p>An organizer account has been created for you on the Felicity Event Management System.</p>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                        <p>📧 <strong>Login Email:</strong> ${email}</p>
                        <p>🔑 <strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="color: #ef4444;"><strong>Please change your password after first login.</strong></p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Login Now
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    });
};

/**
 * Send event created acknowledgement to organizer
 */
const sendEventCreatedEmail = async ({ organizerEmail, organizerName, eventName, eventType, status }) => {
    return sendEmail({
        to: organizerEmail,
        subject: `📋 Event Created: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Event Created! 📋</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${organizerName},</h2>
                    <p>Your event has been successfully created.</p>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                        <h3 style="margin-top: 0; color: #667eea;">${eventName}</h3>
                        <p>📂 <strong>Type:</strong> ${eventType}</p>
                        <p>📌 <strong>Status:</strong> ${status === 'published' ? 'Published (Live)' : 'Draft'}</p>
                    </div>
                    ${status === 'draft' ? '<p>Your event is saved as a draft. Don\'t forget to publish it when you\'re ready!</p>' : '<p>Your event is now live and accepting registrations!</p>'}
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer/dashboard" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Dashboard
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    });
};

/**
 * Send event published notification to organizer
 */
const sendEventPublishedEmail = async ({ organizerEmail, organizerName, eventName, eventStartDate }) => {
    return sendEmail({
        to: organizerEmail,
        subject: `🚀 Event Published: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Event Published! 🚀</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${organizerName},</h2>
                    <p>Your event <strong>${eventName}</strong> is now live!</p>
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 15px 0;">
                        <p>📅 <strong>Starts:</strong> ${eventStartDate ? new Date(eventStartDate).toLocaleString() : 'TBD'}</p>
                        <p>✅ <strong>Status:</strong> Published — Accepting registrations</p>
                    </div>
                    <p>Participants can now find and register for your event.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer/dashboard" 
                           style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Manage Event
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    });
};

/**
 * Send event cancelled notification to all registered participants (bulk)
 */
const sendEventCancelledToParticipants = async ({ participants, eventName, organizerName }) => {
    const results = [];
    for (const p of participants) {
        const result = await sendEmail({
            to: p.email,
            subject: `⚠️ Event Cancelled: ${eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #dc3545; padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Event Cancelled ⚠️</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <h2>Hi ${p.name || 'Participant'},</h2>
                        <p>We regret to inform you that the event <strong>${eventName}</strong> organized by <strong>${organizerName}</strong> has been cancelled.</p>
                        <p>Your registration has been automatically cancelled. We apologize for any inconvenience.</p>
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" 
                               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Browse Other Events
                            </a>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                        Felicity Event Management System — IIIT Hyderabad
                    </div>
                </div>
            `,
        }).catch(() => null);
        results.push(result);
    }
    return results;
};

/**
 * Send event ended early notification to all registered participants
 */
const sendEventEndedEarlyEmail = async ({ participants, eventName, organizerName, organizerEmail }) => {
    // Notify organizer
    sendEmail({
        to: organizerEmail,
        subject: `🏁 Event Ended Early: ${eventName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Event Ended Early 🏁</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2>Hi ${organizerName},</h2>
                    <p>Your event <strong>${eventName}</strong> has been ended early and marked as completed.</p>
                    <p>All registered participants have been notified.</p>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/organizer/dashboard" 
                           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            View Dashboard
                        </a>
                    </div>
                </div>
                <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                    Felicity Event Management System — IIIT Hyderabad
                </div>
            </div>
        `,
    }).catch(() => {});

    // Notify all participants
    for (const p of participants) {
        sendEmail({
            to: p.email,
            subject: `🏁 Event Ended: ${eventName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #6c757d 0%, #495057 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Event Ended 🏁</h1>
                    </div>
                    <div style="padding: 30px; background: #f9fafb;">
                        <h2>Hi ${p.name || 'Participant'},</h2>
                        <p>The event <strong>${eventName}</strong> organized by <strong>${organizerName}</strong> has ended.</p>
                        <p>Thank you for your participation!</p>
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" 
                               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Browse More Events
                            </a>
                        </div>
                    </div>
                    <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
                        Felicity Event Management System — IIIT Hyderabad
                    </div>
                </div>
            `,
        }).catch(() => {});
    }
};

module.exports = {
    sendEmail,
    sendRegistrationConfirmation,
    sendEventRegistrationConfirmation,
    sendEventCancellationEmail,
    sendOrganizerCreatedEmail,
    sendEventCreatedEmail,
    sendEventPublishedEmail,
    sendEventCancelledToParticipants,
    sendEventEndedEarlyEmail,
};
