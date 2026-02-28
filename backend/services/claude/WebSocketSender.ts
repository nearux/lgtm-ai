import type WebSocket from 'ws';
import { WebSocket as WsWebSocket } from 'ws';
import type { WsServerMessage } from '../../types/websocket.js';

export class WebSocketSender {
  constructor(private readonly ws: WebSocket) {}

  send(msg: WsServerMessage): void {
    if (this.ws.readyState === WsWebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
