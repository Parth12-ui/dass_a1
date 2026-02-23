const crypto = require('crypto');
const Team = require('../models/Team');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const { generateQR } = require('../utils/qrcode');
const { sendTicketEmail, sendTeamInviteEmail } = require('../utils/email');

/**
 * POST /api/teams/create
 * Leader creates a team for a team event
 */
const createTeam = async (req, res) => {
    try {
        const { eventId, name } = req.body;
        if (!eventId || !name) {
            return res.status(400).json({ message: 'Event ID and team name are required' });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!event.isTeamEvent) return res.status(400).json({ message: 'This is not a team event' });
        if (event.status !== 'published' && event.status !== 'ongoing') {
            return res.status(400).json({ message: 'Event is not open for registration' });
        }

        // Check if user is already in a team for this event
        const existingTeam = await Team.findOne({
            event: eventId,
            $or: [{ leader: req.user.id }, { members: req.user.id }],
            status: { $ne: 'disbanded' },
        });
        if (existingTeam) {
            return res.status(409).json({ message: 'You are already in a team for this event' });
        }

        const team = new Team({
            name,
            event: eventId,
            leader: req.user.id,
            members: [req.user.id],
            maxSize: event.teamSize?.max || 4,
        });

        await team.save();

        await team.populate('leader', 'firstName lastName email');
        await team.populate('members', 'firstName lastName email');

        res.status(201).json({
            message: 'Team created! Share the invite code with your teammates.',
            team,
        });
    } catch (err) {
        console.error('Create team error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/teams/join
 * Join a team via invite code
 */
const joinTeam = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

        const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() });
        if (!team) return res.status(404).json({ message: 'Invalid invite code' });
        if (team.status === 'disbanded') return res.status(400).json({ message: 'Team has been disbanded' });
        if (team.status === 'complete') return res.status(400).json({ message: 'Team is already full' });

        // Check if already in a team for this event
        const existingTeam = await Team.findOne({
            event: team.event,
            $or: [{ leader: req.user.id }, { members: req.user.id }],
            status: { $ne: 'disbanded' },
        });
        if (existingTeam) {
            return res.status(409).json({ message: 'You are already in a team for this event' });
        }

        if (team.members.length >= team.maxSize) {
            return res.status(400).json({ message: 'Team is full' });
        }

        team.members.push(req.user.id);

        // Auto-complete if team is now full
        if (team.members.length >= team.maxSize) {
            team.status = 'complete';
        }

        await team.save();

        // If team is complete, generate tickets for all members
        if (team.status === 'complete') {
            await generateTeamTickets(team);
        }

        await team.populate('leader', 'firstName lastName email');
        await team.populate('members', 'firstName lastName email');

        res.json({
            message: team.status === 'complete' ? 'Team complete! Tickets generated for all members.' : 'Joined team successfully!',
            team,
        });
    } catch (err) {
        console.error('Join team error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Generate tickets for all team members when team is complete
 */
async function generateTeamTickets(team) {
    const event = await Event.findById(team.event);
    if (!event) return;

    for (const memberId of team.members) {
        // Skip if already registered
        const existing = await Registration.findOne({ event: event._id, participant: memberId });
        if (existing) continue;

        const ticketId = `TKT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const qrCode = await generateQR(ticketId);

        const registration = new Registration({
            event: event._id,
            participant: memberId,
            ticketId,
            qrCode,
            status: 'confirmed',
            paymentStatus: event.registrationFee > 0 ? 'paid' : 'na',
        });
        await registration.save();

        event.registrationCount += 1;
        event.registrationsLast24h += 1;
        if (event.registrationFee > 0) {
            event.totalRevenue += event.registrationFee;
        }

        // Send ticket email
        const user = await User.findById(memberId);
        if (user) {
            try {
                await sendTicketEmail(user.email, {
                    ticketId,
                    eventName: event.name,
                    eventDate: new Date(event.startDate).toLocaleDateString(),
                    participantName: `${user.firstName} ${user.lastName}`,
                    qrCode,
                });
            } catch (e) {
                console.error('Team ticket email failed:', e);
            }
        }
    }

    await event.save();
}

/**
 * GET /api/teams/my
 * List user's teams
 */
const getMyTeams = async (req, res) => {
    try {
        const teams = await Team.find({
            members: req.user.id,
            status: { $ne: 'disbanded' },
        })
            .populate('event', 'name startDate endDate status isTeamEvent')
            .populate('leader', 'firstName lastName email')
            .populate('members', 'firstName lastName email')
            .sort({ createdAt: -1 });

        res.json(teams);
    } catch (err) {
        console.error('Get my teams error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/teams/:id
 * Team detail
 */
const getTeamDetail = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('event', 'name startDate endDate status isTeamEvent teamSize')
            .populate('leader', 'firstName lastName email')
            .populate('members', 'firstName lastName email');

        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Verify user is a member
        const isMember = team.members.some((m) => m._id.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ message: 'You are not a member of this team' });

        res.json(team);
    } catch (err) {
        console.error('Get team detail error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * POST /api/teams/:id/leave
 * Leave a team
 */
const leaveTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        if (team.status === 'complete') {
            return res.status(400).json({ message: 'Cannot leave a complete team' });
        }

        const isMember = team.members.some((m) => m.toString() === req.user.id);
        if (!isMember) return res.status(403).json({ message: 'You are not a member' });

        // If leader leaves, disband team
        if (team.leader.toString() === req.user.id) {
            team.status = 'disbanded';
            await team.save();
            return res.json({ message: 'Team disbanded (leader left)' });
        }

        // Remove member
        team.members = team.members.filter((m) => m.toString() !== req.user.id);
        await team.save();

        res.json({ message: 'Left team successfully' });
    } catch (err) {
        console.error('Leave team error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createTeam,
    joinTeam,
    getMyTeams,
    getTeamDetail,
    leaveTeam,
};
