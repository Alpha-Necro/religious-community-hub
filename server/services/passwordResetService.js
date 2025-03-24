const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { securityAlertService } = require('./securityAlertService');
const nodemailer = require('nodemailer');

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.NODE_ENV === 'production',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const passwordResetService = {
  async generateResetToken(userId) {
    try {
      // Generate a random token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (1 hour)
      const expiresAt = new Date(Date.now() + 3600000);

      // Update user with reset token
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await user.update({
        passwordResetToken: token,
        passwordResetExpires: expiresAt
      });

      // Create JWT for password reset
      const resetToken = jwt.sign(
        { userId, token },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return resetToken;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Password Reset Token Generation Failed',
        description: `Failed to generate password reset token: ${error.message}`,
        severity: 'ERROR',
        type: 'PASSWORD_RESET_FAILURE',
        userId,
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async sendResetEmail(user, resetToken) {
    try {
      const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>We received a request to reset your password.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>To reset your password, click the following link:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
        `
      };

      await transporter.sendMail(mailOptions);

      await securityAlertService.createAlert({
        title: 'Password Reset Email Sent',
        description: `Password reset email sent to ${user.email}`,
        severity: 'INFO',
        type: 'PASSWORD_RESET_EMAIL_SENT',
        userId: user.id,
        metadata: {
          email: user.email,
          resetUrl
        }
      });
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Password Reset Email Failed',
        description: `Failed to send password reset email: ${error.message}`,
        severity: 'ERROR',
        type: 'PASSWORD_RESET_EMAIL_FAILED',
        userId: user.id,
        metadata: {
          email: user.email,
          error: error.message
        }
      });

      throw error;
    }
  },

  async validateResetToken(resetToken) {
    try {
      // Verify JWT
      const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      const { userId, token } = decoded;

      // Find user with matching token
      const user = await User.findByPk(userId, {
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      return user;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Invalid Password Reset Token',
        description: `Invalid or expired password reset token: ${error.message}`,
        severity: 'WARNING',
        type: 'INVALID_RESET_TOKEN',
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  },

  async resetPassword(userId, newPassword) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate password
      await user.validatePassword(newPassword);

      // Update password
      await user.changePassword(newPassword);

      // Clear reset token
      await user.update({
        passwordResetToken: null,
        passwordResetExpires: null
      });

      // Send confirmation email
      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
        to: user.email,
        subject: 'Password Reset Successful',
        html: `
          <h2>Password Reset Successful</h2>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in with your new password.</p>
        `
      };

      await transporter.sendMail(mailOptions);

      await securityAlertService.createAlert({
        title: 'Password Reset Successful',
        description: `Password reset successful for user ${user.id}`,
        severity: 'INFO',
        type: 'PASSWORD_RESET_SUCCESS',
        userId: user.id,
        metadata: {
          email: user.email
        }
      });

      return user;
    } catch (error) {
      await securityAlertService.createAlert({
        title: 'Password Reset Failed',
        description: `Password reset failed: ${error.message}`,
        severity: 'ERROR',
        type: 'PASSWORD_RESET_FAILURE',
        userId: userId,
        metadata: {
          error: error.message
        }
      });

      throw error;
    }
  }
};

module.exports = passwordResetService;
