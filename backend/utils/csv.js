const { createObjectCsvStringifier } = require('csv-writer');

/**
 * Generate a CSV string from registration data
 * @param {Array} registrations - Array of registration objects (populated)
 * @returns {string} CSV content
 */
const generateParticipantCSV = (registrations) => {
    const csvStringifier = createObjectCsvStringifier({
        header: [
            { id: 'ticketId', title: 'Ticket ID' },
            { id: 'participantName', title: 'Participant Name' },
            { id: 'email', title: 'Email' },
            { id: 'registeredAt', title: 'Registration Date' },
            { id: 'paymentStatus', title: 'Payment Status' },
            { id: 'status', title: 'Status' },
            { id: 'attendanceMarked', title: 'Attendance' },
        ],
    });

    const records = registrations.map((reg) => ({
        ticketId: reg.ticketId,
        participantName: reg.participant
            ? `${reg.participant.firstName} ${reg.participant.lastName}`
            : 'N/A',
        email: reg.participant ? reg.participant.email : 'N/A',
        registeredAt: reg.registeredAt
            ? new Date(reg.registeredAt).toISOString()
            : '',
        paymentStatus: reg.paymentStatus,
        status: reg.status,
        attendanceMarked: reg.attendanceMarked ? 'Yes' : 'No',
    }));

    return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
};

module.exports = { generateParticipantCSV };
