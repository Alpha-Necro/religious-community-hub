const User = require('../models/User');
const { securityAlertService } = require('./securityAlertService');
const { Op } = require('sequelize');
const geoip = require('geoip-lite');

const ipAccessControlService = {
  async validateIP(ip, userId) {
    try {
      // Check if IP is in whitelist
      const isWhitelisted = await this.isIPWhitelisted(ip, userId);
      if (isWhitelisted) {
        return true;
      }

      // Check if IP is in blacklist
      const isBlacklisted = await this.isIPBlacklisted(ip);
      if (isBlacklisted) {
        await securityAlertService.createAlert({
          title: 'Blacklisted IP Access Attempt',
          description: `Access attempt from blacklisted IP: ${ip}`,
          severity: 'WARNING',
          type: 'BLACKLISTED_IP_ACCESS',
          userId,
          metadata: {
            ip,
            country: this.getIPCountry(ip)
          }
        });

        throw new Error('Access denied from blacklisted IP');
      }

      // Check if IP is from suspicious location
      const isSuspicious = await this.isSuspiciousLocation(ip, userId);
      if (isSuspicious) {
        await securityAlertService.createAlert({
          title: 'Suspicious IP Access Attempt',
          description: `Access attempt from suspicious location: ${ip}`,
          severity: 'WARNING',
          type: 'SUSPICIOUS_IP_ACCESS',
          userId,
          metadata: {
            ip,
            country: this.getIPCountry(ip)
          }
        });

        throw new Error('Access from suspicious location');
      }

      // Check if IP has too many failed attempts
      const hasTooManyAttempts = await this.hasTooManyFailedAttempts(ip);
      if (hasTooManyAttempts) {
        await securityAlertService.createAlert({
          title: 'IP Rate Limit Exceeded',
          description: `IP rate limit exceeded: ${ip}`,
          severity: 'WARNING',
          type: 'RATE_LIMIT_EXCEEDED',
          userId,
          metadata: {
            ip,
            country: this.getIPCountry(ip)
          }
        });

        throw new Error('Too many failed attempts from this IP');
      }

      return true;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'IP Validation Failed',
        description: `IP validation failed: ${error.message}`,
        severity: 'ERROR',
        type: 'IP_VALIDATION_FAILED',
        metadata: {
          ip,
          error: error.message
        }
      });

      throw error;
    }
  },

  async isIPWhitelisted(ip, userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return false;
      }

      // Check if IP is in user's whitelist
      if (user.whitelistedIPs?.includes(ip)) {
        return true;
      }

      // Check if IP is in global whitelist
      const globalWhitelist = process.env.IP_WHITELIST?.split(',') || [];
      return globalWhitelist.includes(ip);
    } catch (error) {
      return false;
    }
  },

  async isIPBlacklisted(ip) {
    try {
      // Check if IP is in global blacklist
      const globalBlacklist = process.env.IP_BLACKLIST?.split(',') || [];
      if (globalBlacklist.includes(ip)) {
        return true;
      }

      // Check if IP is from blocked country
      const country = this.getIPCountry(ip);
      const blockedCountries = process.env.BLOCKED_COUNTRIES?.split(',') || [];
      return blockedCountries.includes(country);
    } catch (error) {
      return false;
    }
  },

  async isSuspiciousLocation(ip, userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return false;
      }

      // Get user's last login location
      const lastLocation = user.lastLoginLocation?.country;
      if (!lastLocation) {
        return false;
      }

      // Get current location
      const currentLocation = this.getIPCountry(ip);
      if (!currentLocation) {
        return false;
      }

      // Check if locations are different
      if (lastLocation !== currentLocation) {
        // Check if distance is too far
        const geo1 = geoip.lookup(lastLocation);
        const geo2 = geoip.lookup(currentLocation);
        if (geo1 && geo2) {
          const distance = this.calculateDistance(geo1.ll, geo2.ll);
          if (distance > process.env.MAX_LOGIN_DISTANCE || 1000) { // 1000 km
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  },

  async hasTooManyFailedAttempts(ip) {
    try {
      // Get failed login attempts for this IP in the last hour
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 1);

      const attempts = await User.count({
        where: {
          lastFailedLogin: {
            [Op.gt]: cutoffDate
          },
          '$failedLoginIPs.ip$': ip
        },
        include: [
          {
            model: User,
            as: 'failedLoginIPs',
            where: { ip }
          }
        ]
      });

      return attempts >= (process.env.MAX_FAILED_ATTEMPTS_PER_IP || 10);
    } catch (error) {
      return false;
    }
  },

  getIPCountry(ip) {
    try {
      const geo = geoip.lookup(ip);
      return geo?.country || null;
    } catch (error) {
      return null;
    }
  },

  calculateDistance([lat1, lon1], [lat2, lon2]) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  },

  toRadians(degrees) {
    return degrees * Math.PI / 180;
  },

  async blockIP(ip, reason) {
    try {
      // Add IP to global blacklist
      const currentBlacklist = process.env.IP_BLACKLIST?.split(',') || [];
      currentBlacklist.push(ip);
      process.env.IP_BLACKLIST = currentBlacklist.join(',');

      await securityAlertService.createAlert({
        title: 'IP Blocked',
        description: `IP ${ip} blocked: ${reason}`,
        severity: 'INFO',
        type: 'IP_BLOCKED',
        metadata: {
          ip,
          reason,
          country: this.getIPCountry(ip)
        }
      });

      return true;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'IP Blocking Failed',
        description: `Failed to block IP: ${error.message}`,
        severity: 'ERROR',
        type: 'IP_BLOCKING_FAILED',
        metadata: {
          ip,
          error: error.message
        }
      });

      throw error;
    }
  },

  async unblockIP(ip) {
    try {
      // Remove IP from global blacklist
      const currentBlacklist = process.env.IP_BLACKLIST?.split(',') || [];
      const index = currentBlacklist.indexOf(ip);
      if (index > -1) {
        currentBlacklist.splice(index, 1);
        process.env.IP_BLACKLIST = currentBlacklist.join(',');
      }

      await securityAlertService.createAlert({
        title: 'IP Unblocked',
        description: `IP ${ip} unblocked`,
        severity: 'INFO',
        type: 'IP_UNBLOCKED',
        metadata: {
          ip,
          country: this.getIPCountry(ip)
        }
      });

      return true;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'IP Unblocking Failed',
        description: `Failed to unblock IP: ${error.message}`,
        severity: 'ERROR',
        type: 'IP_UNBLOCKING_FAILED',
        metadata: {
          ip,
          error: error.message
        }
      });

      throw error;
    }
  },

  async cleanupOldIPLogs() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24); // Keep logs for 24 hours

      const users = await User.findAll();
      let cleanedLogs = 0;

      for (const user of users) {
        const failedLoginIPs = user.failedLoginIPs || [];
        const recentIPs = failedLoginIPs.filter(ip => {
          return new Date(ip.timestamp) > cutoffDate;
        });

        if (recentIPs.length < failedLoginIPs.length) {
          await user.update({
            failedLoginIPs: recentIPs
          });
          cleanedLogs += failedLoginIPs.length - recentIPs.length;
        }
      }

      await securityAlertService.createAlert({
        title: 'IP Log Cleanup Completed',
        description: `Cleaned up ${cleanedLogs} old IP logs`,
        severity: 'INFO',
        type: 'IP_LOG_CLEANUP',
        metadata: {
          cleanedLogs,
          cutoffDate
        }
      });

      return cleanedLogs;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'IP Log Cleanup Failed',
        description: `Failed to cleanup IP logs: ${error.message}`,
        severity: 'ERROR',
        type: 'IP_LOG_CLEANUP_FAILED',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  }
};

module.exports = ipAccessControlService;
