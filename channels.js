// channels.js - WebSocket Channel Communication

class ChannelManager {
  constructor() {
    this.connection = null;
    this.channelName = "hackathon"; // Fixed channel name
    this.url = "wss://chrisrogers.pyscriptapps.com/talking-on-a-channel/api/channels/hackathon";
    this.onMessageReceived = null;
    this.messageQueue = []; // Queue messages while connecting
    this.isConnected = false;
  }

  // Connect to the hackathon channel
  connect() {
    if (this.connection && this.isConnected) {
      console.log(`Already connected to channel: ${this.channelName}`);
      return this.connection;
    }

    console.log(`Attempting to connect to: ${this.url}`);
    
    try {
      const ws = new WebSocket(this.url);
      
      ws.onopen = () => {
        console.log(`✅ Connected to channel: ${this.channelName}`);
        this.isConnected = true;
        
        if (window.outputDiv) {
          window.outputDiv.textContent += `✅ Connected to channel: ${this.channelName}\n`;
        }
        
        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          ws.send(JSON.stringify(msg));
          console.log(`📤 Sent queued:`, msg);
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(`📥 Received:`, data);
          
          if (window.outputDiv) {
            window.outputDiv.textContent += `📥 Channel: topic="${data.topic}" value=${JSON.stringify(data.value)}\n`;
          }
          
          // Store messages
          if (!window.channelMessages) window.channelMessages = [];
          window.channelMessages.push(data);
          
          // Call callback if set
          if (this.onMessageReceived) {
            this.onMessageReceived(data);
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error:`, error);
        this.isConnected = false;
        if (window.outputDiv) {
          window.outputDiv.textContent += `❌ Channel connection error - Check console\n`;
        }
      };

      ws.onclose = (event) => {
        console.log(`⚠️ Disconnected from channel`, event.code, event.reason);
        this.isConnected = false;
        this.connection = null;
        if (window.outputDiv) {
          window.outputDiv.textContent += `⚠️ Disconnected from channel (code: ${event.code})\n`;
        }
      };

      this.connection = ws;
      return ws;
      
    } catch (error) {
      console.error(`Failed to create WebSocket:`, error);
      if (window.outputDiv) {
        window.outputDiv.textContent += `❌ Failed to connect to channel\n`;
      }
      return null;
    }
  }

  // Send message to the channel
  sendMessage(topic, value) {
    const message = {
      topic: topic,
      value: value
    };
    
    // Connect if not already connected
    if (!this.connection) {
      this.connect();
    }
    
    // If connecting, queue the message
    if (this.connection && this.connection.readyState === WebSocket.CONNECTING) {
      this.messageQueue.push(message);
      console.log(`Queued message:`, message);
    } 
    // If open, send immediately
    else if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
      console.log(`📤 Sent:`, message);
      
      if (window.outputDiv) {
        window.outputDiv.textContent += `📤 Sent: topic="${topic}" value=${JSON.stringify(value)}\n`;
      }
    }
    // Otherwise reconnect and queue
    else {
      console.log(`Reconnecting...`);
      this.connection = null;
      this.isConnected = false;
      this.messageQueue.push(message);
      this.connect();
    }
  }

  // Read last message from channel
  readMessage() {
    if (!window.channelMessages || window.channelMessages.length === 0) {
      return null;
    }
    
    // Get the first message (FIFO)
    return window.channelMessages.shift();
  }

  // Disconnect from channel
  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
      this.isConnected = false;
    }
  }
}

// Create global instance
window.channelManager = new ChannelManager();