const WebSocket = require('ws');
const { Server } = require('ws');

const websocketServer = {
  wss: null,
  clients: new Set(),

  initialize: async () => {
    try {
      this.wss = new Server({
        port: process.env.WEBSOCKET_PORT || 8080,
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

      console.log('WebSocket server initialized');
      return true;
    } catch (error) {
      console.error('WebSocket server initialization failed:', error);
      return false;
    }
  },

  broadcast: async (event, data) => {
    try {
      const message = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      });

      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error('WebSocket broadcast failed:', error);
    }
  },

  broadcastMaintenanceMode: async (status, message) => {
    try {
      await this.broadcast('maintenance-mode', {
        status,
        message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to broadcast maintenance mode:', error);
    }
  },

  close: async () => {
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

module.exports = websocketServer;
