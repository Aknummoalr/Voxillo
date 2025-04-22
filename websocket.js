const WebSocket = require('ws');

function startWebSocketServer() {
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    ws.on('message', (message) => {
      console.log('Received WebSocket message:', message);
    });
    ws.on('close', () => console.log('WebSocket connection closed'));
  });

  console.log('WebSocket server running on port 8080');
}

module.exports = { startWebSocketServer };