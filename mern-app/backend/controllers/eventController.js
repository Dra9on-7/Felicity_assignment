const Event = require('../models/Event');
const Management = require('../models/Management');
const Registration = require('../models/Registration');
const codegen = require('qrcode');

exports.regstr = async (req, res) => {
    try {
        const { participantId, eventId, registrationData } = req.body;

        if(!eventId || !participantId) {
            return res.status(400).json({ message: 'Event ID and Participant ID are required' });
        }
        
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        const regc = await Registration.countDocuments({ eventId });
        if (event.registrationLimit && regc >= event.registrationLimit) {
            return res.status(400).json({ message: 'Registration limit reached' });
        }

        const regchk = await Registration.findOne({ participantId, eventId });
        if (regchk) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }

        const qrstr = await codegen.toString(`Event:${eventId}-Participant:${participantId}`, { type: 'png' });
        const registration = new Registration({
            eventId,
            participantId,
            registrationData,
            status: 'registered',
            ticket: {

                qrCode: qrstr,
                issuedAt: new Date(),
            },
        });
        await registration.save();

        return res.status(201).json({ message: 'Registration successful', registration });
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};


