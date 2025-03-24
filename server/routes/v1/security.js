const express = require('express');
const router = express.Router();
const { securityAlertService } = require('../../services/securityAlertService');
const { auth } = require('../../middleware/auth');
const { admin } = require('../../middleware/roles');

// Get security alerts
router.get('/alerts', auth, admin, async (req, res) => {
  try {
    const alerts = await securityAlertService.getAlerts({
      limit: req.query.limit || 50,
      offset: req.query.offset || 0,
      severity: req.query.severity,
      type: req.query.type,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    res.json({
      status: 'success',
      data: alerts,
      message: 'Security alerts retrieved successfully'
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Security Alert Retrieval Failed',
      description: `Failed to retrieve security alerts: ${error.message}`,
      severity: 'ERROR',
      type: 'SECURITY_ALERT_RETRIEVAL_FAILED',
      metadata: {
        ip: req.ip,
        error: error.message
      }
    });

    res.status(500).json({
      error: 'Failed to retrieve security alerts',
      code: 'SECURITY_ALERT_RETRIEVAL_FAILED',
      details: error.message
    });
  }
});

// Get security statistics
router.get('/stats', auth, admin, async (req, res) => {
  try {
    const stats = await securityAlertService.getSecurityStats({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    res.json({
      status: 'success',
      data: stats,
      message: 'Security statistics retrieved successfully'
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'Security Statistics Failed',
      description: `Failed to retrieve security statistics: ${error.message}`,
      severity: 'ERROR',
      type: 'SECURITY_STATS_FAILED',
      metadata: {
        ip: req.ip,
        error: error.message
      }
    });

    res.status(500).json({
      error: 'Failed to retrieve security statistics',
      code: 'SECURITY_STATS_FAILED',
      details: error.message
    });
  }
});

// Block IP address
router.post('/block-ip', auth, admin, async (req, res) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required',
        code: 'INVALID_REQUEST'
      });
    }

    await securityAlertService.blockIP(ip, reason);

    res.json({
      status: 'success',
      data: { ip, blocked: true },
      message: 'IP address blocked successfully'
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'IP Blocking Failed',
      description: `Failed to block IP: ${error.message}`,
      severity: 'ERROR',
      type: 'IP_BLOCKING_FAILED',
      metadata: {
        ip: req.body.ip,
        error: error.message
      }
    });

    res.status(500).json({
      error: 'Failed to block IP address',
      code: 'IP_BLOCKING_FAILED',
      details: error.message
    });
  }
});

// Unblock IP address
router.post('/unblock-ip', auth, admin, async (req, res) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        error: 'IP address is required',
        code: 'INVALID_REQUEST'
      });
    }

    await securityAlertService.unblockIP(ip);

    res.json({
      status: 'success',
      data: { ip, blocked: false },
      message: 'IP address unblocked successfully'
    });
  } catch (error) {
    await securityAlertService.createAlert({
      title: 'IP Unblocking Failed',
      description: `Failed to unblock IP: ${error.message}`,
      severity: 'ERROR',
      type: 'IP_UNBLOCKING_FAILED',
      metadata: {
        ip: req.body.ip,
        error: error.message
      }
    });

    res.status(500).json({
      error: 'Failed to unblock IP address',
      code: 'IP_UNBLOCKING_FAILED',
      details: error.message
    });
  }
});

module.exports = router;
