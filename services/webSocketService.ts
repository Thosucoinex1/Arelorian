import { useStore } from '../store';

const WS_URL = `ws://${window.location.host}`;

class WebSocketService {
  private ws: WebSocket | null = null;

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('Connected to WebSocket server');
      useStore.getState().addLog('Real-time connection established.', 'SYSTEM');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);

      // Here we will handle incoming messages and update the store
      // For now, we'll just log it
      useStore.getState().addLog(`Received data: ${event.data}`, 'SYSTEM');

      if (message.type === 'PLAYER_MOVE') {
        useStore.setState(state => ({
          agents: state.agents.map(agent =>
            agent.id === message.payload.id
              ? { ...agent, position: message.payload.position }
              : agent
          )
        }));
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      useStore.getState().addLog('Real-time connection lost.', 'SYSTEM');
      // Optional: implement reconnection logic here
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      useStore.getState().addLog('Real-time connection error.', 'ERROR');
    };
  }

  sendMessage(type: string, payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const webSocketService = new WebSocketService();
