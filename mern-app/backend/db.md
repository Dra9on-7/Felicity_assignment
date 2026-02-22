
# Fest Event Management System – Database Design Plan

## 1. Entities & Fields

### User (Base)
- _id (ObjectId)
- role: 'participant' | 'organizer' | 'admin'
- email (unique, required)
- password (hashed)
- createdAt, updatedAt

#### Participant (extends User)
- firstName, lastName
- participantType: 'IIIT' | 'Non-IIIT'
- collegeOrOrgName
- contactNumber

#### Organizer (extends User)
- organizerName
- category
- description
- contactEmail
- discordWebhook

#### Admin (extends User)
- adminName (optional)
- privileges

### Event
- _id (ObjectId)
- eventName
- eventDescription
- eventType: 'normal' | 'merchandise'
- eligibility
- registrationDeadline
- eventStartDate
- eventEndDate
- registrationLimit
- registrationFee
- organizerId: Organizer._id (ref)
- eventTags: [String]
- status: 'draft' | 'published'
- registrationFormFields: [Custom fields for normal events]
- merchandiseDetails (if type = merchandise):
	- items: [{ name, size, color, variants, stockQty, purchaseLimit }]
- createdAt, updatedAt

### Registration
- _id (ObjectId)
- participantId: Participant._id (ref)
- eventId: Event._id (ref)
- registrationData: { answers to custom form fields }
- ticket: { qrCode, issuedAt }
- status: 'registered' | 'cancelled' | 'attended'
- createdAt, updatedAt

### Preference
- _id (ObjectId)
- participantId: Participant._id (ref)
- areasOfInterest: [String]
- followedClubs: [Organizer._id]

---

## 2. Relationships & References

- User._id
	- Referenced by: Preference.participantId, Registration.participantId, Event.organizerId, Preference.followedClubs
- Event._id
	- Referenced by: Registration.eventId
- Organizer (User with role='organizer')
	- Referenced by: Event.organizerId, Preference.followedClubs
- Participant (User with role='participant')
	- Referenced by: Registration.participantId, Preference.participantId
- Registration
	- Connects Participant and Event (many-to-many)
- Preference
	- Connects Participant to areasOfInterest and followedClubs (many-to-many with Organizer)

---

## 3. Example Queries

- All events a participant registered for:
	- Registration.find({ participantId: X }) → get eventIds
- All participants in an event:
	- Registration.find({ eventId: Y }) → get participantIds
- All events by an organizer:
	- Event.find({ organizerId: Z })
- A participant’s preferences:
	- Preference.findOne({ participantId: X })

---

## 4. Optional/Advanced Relations

- Merchandise purchase details (could be a subdocument or a separate collection if needed for analytics)
- Team registrations (if implementing hackathon teams, a Team collection with references to participants and events)
- Password reset requests (could be a separate collection referencing User._id)

---

## 5. Notes

- All relationships are normalized for scalability and efficient queries.
- Organizer and Admin are specializations of User (single collection, differentiated by role).
- Registration and Preference collections handle all many-to-many relationships.
