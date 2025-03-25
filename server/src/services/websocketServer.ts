import { Server as WebSocketServer, WebSocket as WebSocketClient } from 'ws';
import { Server as HTTPServer } from 'http';
import { Logger } from '../utils/logger';
import { MonitoringService } from '../services/monitoringService';

const logger = new Logger('WebSocketServer');
const monitoringService = MonitoringService.getInstance();

interface MaintenanceNotification {
  type: 'maintenance';
  status: 'active' | 'inactive';
  message: string;
  timestamp: string;
}

export class WebSocketServerManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocketClient> = new Set();

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocketClient) => {
      this.clients.add(ws);
      
      ws.on('close', (code: number, reason: Buffer | string) => {
        this.handleWebSocketClose(ws, code, reason);
      });

      ws.on('error', (error: Error) => {
        this.handleWebSocketError(error, ws);
      });
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error:', { error });
      monitoringService.trackWebSocketError(error);
    });
  }

  private handleWebSocketError(error: Error, client: WebSocketClient): void {
    logger.error('WebSocket error:', { error });
    monitoringService.trackWebSocketError(error, client);
    this.clients.delete(client);
  }

  private handleWebSocketClose(client: WebSocketClient, code: number, reason: Buffer | string): void {
    this.clients.delete(client);
    logger.info('WebSocket client disconnected:', { code, reason });
    monitoringService.trackWebSocketDisconnect(client, code, reason);
  }

  async broadcastMaintenanceMode(status: 'active' | 'inactive', message: string): Promise<void> {
    try {
      const notification: MaintenanceNotification = {
        type: 'maintenance',
        status,
        message,
        timestamp: new Date().toISOString()
      };

      const json = JSON.stringify(notification);
      
      for (const client of this.clients) {
        if (client.readyState === WebSocketClient.OPEN) {
          try {
            await new Promise((resolve, reject) => {
              client.send(json, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(null);
                }
              });
            });
          } catch (error: unknown) {
            logger.error('Failed to send maintenance notification:', { error });
            this.clients.delete(client);
          }
        }
      }

      monitoringService.trackMaintenanceBroadcast({
        status,
        message,
        clientCount: this.clients.size
      });

    } catch (error: unknown) {
      logger.error('Error broadcasting maintenance notification:', { error });
      throw error;
    }
  }

  public broadcastError(error: Error): void {
    const errorData = {
      type: 'error',
      code: error.name,
      message: error.message,
      severity: 'error',
      timestamp: new Date().toISOString()
    };

    this.clients.forEach(client => {
      if (client.readyState === WebSocketClient.OPEN) {
        client.send(JSON.stringify(errorData));
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
    this.clients.clear();
  }

  public async reinitialize(httpServer: HTTPServer): Promise<void> {
    try {
      // Close existing connections
      this.close();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reinitialize the server
      this.wss = new WebSocketServer({ server: httpServer });
      this.setupEventHandlers();
      
      logger.info('WebSocket server reinitialized');
    } catch (error: unknown) {
      logger.error('Failed to reinitialize WebSocket server:', { error });
      throw error;
    }
  }
}

export const websocketServer = new WebSocketServerManager(null as unknown as HTTPServer);
