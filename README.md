# DASS A1 - Event Management Platform

This repository contains the backend and frontend for an Event Management Platform. 

## Database Structure & Models

The backend utilizes MongoDB with Mongoose for Object Data Modeling (ODM). The database is structured around the following core entities:

### 1. Users & Authentication
- **User (`models/User.js`)**: Represents participants on the platform. Stores details like `firstName`, `lastName`, `email`, hashed `password`, `participantType` (IIIT vs Non-IIIT), `collegeName`, and `contactNumber`. Also includes preferences like `interests`, `followedOrganizers`, and an `onboardingCompleted` flag.
- **Organizer (`models/Organizer.js`)**: Represents event organizers (clubs/committees). Contains `name`, `category`, `description`, `website`, `contactEmail`, `socialLinks`, `loginEmail` (for authentication), hashed `password`, `isActive`, and `profileImage`.
- **Admin (`models/Admin.js`)**: Superusers who manage organizers. Contains `email` and hashed `password`.
- **PasswordResetRequest (`models/PasswordResetRequest.js`)**: Tracks password recovery. Contains `user` reference, `userType` (admin/organizer/participant), a secure `token`, and an `expiresAt` timestamp.

### 2. Events & Registrations
- **Event (`models/Event.js`)**: The core entity for activities. Includes `name`, `description`, `tags`, `type` (normal or merchandise), temporal data (`startDate`, `endDate`, `registrationDeadline`), `status` (draft, published, ongoing, completed, cancelled), and location/link data. It also handles advanced configurations like `isTeamEvent`, `teamSize`, `eligibility` (all, iiit, non-iiit), `customForm` structure, `registrationFee`, and an array of `merchandiseItems` with stock limits. Tracks analytics like `registrationCount` and `totalRevenue`.
- **Registration (`models/Registration.js`)**: A record linking a `Participant` to an `Event`. Stores the `status` (pending, confirmed, rejected, cancelled), `ticketId`, generated `qrCode`, and `paymentStatus` (na, pending_approval, paid, rejected). For specialized events, it holds `formResponses` and `merchandiseSelections`.
- **Team (`models/Team.js`)**: Facilitates group participation for team events. Tracks the `name`, `event` reference, `leader`, array of `members`, `maxSize`, `status` (forming, complete, closed, disbanded), `inviteCode`, and individual `memberFormResponses`.

### 3. Engagement & Interaction
- **Feedback (`models/Feedback.js`)**: Allows participants to review completed events. Contains `event` and `participant` references, a 1-5 `rating`, a text `comment`, and an `isAnonymous` flag. Guaranteed unique per participant/event pair.
- **ForumMessage (`models/ForumMessage.js`)**: Facilitates discussion within an event. Contains references to the `event` and the `sender` (User), along with the text `content`.

## System Functionality & Data Flow
1. **Event Creation**: Organizers define events, specifying attributes like eligibility, registration limits, fees, and custom metadata templates.
2. **Registration & Teaming**: Users discover events. They can register directly or form/join a team. Team leaders can manage their roster and check out when the minimum size is met, which generates registrations for all members via `closeTeam`.
3. **Merchandise & Payments**: When events involve fees or physical items, registrations track `merchandiseSelections` and `paymentProofUrl`. Organizers can manually approve these payments, which adjusts `item.stockQuantity` and converts the registration status to `confirmed`, generating a ticket and QR code.
4. **Post-Event**: Organizers mark events as completed. Participants can then submit ratings and comments (optionally anonymous) tracked in the Feedback model.

