const { Server } = require('ws');

const simpleMaintenanceService = {
  wss: null,
  clients: new Set(),

  initialize: async function() {
    try {
      this.wss = new Server({
        port: 8081,
        clientTracking: true,
      });

      this.wss.on('connection', (ws) => {
        this.clients.add(ws);

        ws.on('close', () => {
          this.clients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });

      console.log('Maintenance WebSocket server initialized');
      return true;
    } catch (error) {
      console.error('WebSocket server initialization failed:', error);
      return false;
    }
  },

  triggerMaintenanceMode: async function(reason) {
    try {
      // Determine the appropriate maintenance type based on the reason
      let maintenanceType = 'DEFAULT';
      
      if (reason.includes('database')) {
        maintenanceType = 'DATABASE_MAINTENANCE';
      } else if (reason.includes('security')) {
        maintenanceType = 'SECURITY_UPDATE';
      } else if (reason.includes('upgrade')) {
        maintenanceType = 'UPGRADE';
      } else if (reason.includes('error')) {
        maintenanceType = 'CRITICAL_ERROR';
      }

      // Format the reason with the maintenance type
      const formattedReason = `${maintenanceType}: ${reason}`;

      // Broadcast the maintenance mode status
      await this.broadcastMaintenanceMode('active', formattedReason);
      console.log('Maintenance mode triggered:', formattedReason);
    } catch (error) {
      console.error('Failed to trigger maintenance mode:', error);
    }
  },

  broadcastMaintenanceMode: async function(status, message) {
    try {
      const data = {
        status,
        message,
        timestamp: new Date().toISOString(),
      };

      const messageStr = JSON.stringify({
        event: 'maintenance-mode',
        data,
      });

      this.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(messageStr);
        }
      });
    } catch (error) {
      console.error('Failed to broadcast maintenance mode:', error);
    }
  },

  close: async function() {
    try {
      if (this.wss) {
        this.wss.close();
      }
      this.clients.clear();
      console.log('WebSocket server closed');
    } catch (error) {
      console.error('Failed to close WebSocket server:', error);
    }
  },
};

module.exports = simpleMaintenanceService;
