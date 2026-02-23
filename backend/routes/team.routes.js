const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const teamController = require('../controllers/team.controller');

// All team routes require participant auth
router.use(verifyToken, requireRole('participant'));

router.post('/create', teamController.createTeam);
router.post('/join', teamController.joinTeam);
router.get('/my', teamController.getMyTeams);
router.get('/:id', teamController.getTeamDetail);
router.post('/:id/leave', teamController.leaveTeam);

module.exports = router;
