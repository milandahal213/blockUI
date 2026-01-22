// channels.js - WebSocket Channel Communication (Simplified)

class ChannelManager {
  constructor() {
    this.connection = null;
    this.channelName = "hackathon";
    this.url = "wss://chrisrogers.pyscriptapps.com/talking-on-a-channel/api/channels/hackathon";
    this.onMessageReceived = null;
    this.messageQueue = []; // Queue for outgoing messages while connecting
    this.receivedValues = []; // Queue for incoming values
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


        // Update when connected
        document.getElementById('channelStatusText').textContent = 'Connected';
        document.getElementById('channelStatusBox').style.backgroundColor = 'rgba(0, 128, 0, 0.2)';
        document.getElementById('channelStatusBox').style.borderColor = '#4CAF50';
        document.getElementById('channelStatusBox').style.color = '#2E7D32';
        
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
          const message = JSON.parse(event.data);
          console.log(`📥 Received full message:`, message);
          
          // Handle different message types
          if (message.type === 'welcome') {
            console.log('✅ Welcome message received');
            if (window.outputDiv) {
              window.outputDiv.textContent += `✅ Channel ready\n`;
            }
            return;
          }
          
          if (message.type === 'data' && message.payload) {
            // Parse the payload which is a JSON string
            const data = JSON.parse(message.payload);
            console.log(`📥 Parsed data:`, data);
            
            // Store just the value
            this.receivedValues.push(data.value);
            
            if (window.outputDiv) {
              window.outputDiv.textContent += `📥 Channel received: ${JSON.stringify(data.value)}\n`;
              
            }
            
            // Call callback if set
            if (this.onMessageReceived) {
              this.onMessageReceived(data.value);
              document.getElementById('channelMessages').textContent = data.value;
            }
          }
        } catch (e) {
          console.error('Error parsing message:', e, event.data);
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

        document.getElementById('channelStatusText').textContent = 'Disconnected';
        document.getElementById('channelStatusBox').style.backgroundColor = 'rgba(224, 13, 13, 0.49)';
        document.getElementById('channelStatusBox').style.borderColor = '#1406066e';
        document.getElementById('channelStatusBox').style.color = '#616161';

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

  // Send message to the channel and wait for confirmation
  async sendMessage(topic, value) {
    const message = {
      topic: topic,
      value: value
    };
    
    // Connect if not already connected
    if (!this.connection) {
      this.connect();
      // Wait for connection to open
      await this.waitForConnection();
    }
    
    // If connecting, queue the message
    if (this.connection && this.connection.readyState === WebSocket.CONNECTING) {
      await this.waitForConnection();
    }
    
    // Send the message
    if (this.connection && this.connection.readyState === WebSocket.OPEN) {
      this.connection.send(JSON.stringify(message));
      console.log(`📤 Sent:`, message);
      
      if (window.outputDiv) {
        window.outputDiv.textContent += `📤 Sent: topic="${topic}" value=${JSON.stringify(value)}\n`;
      }
      
      // Small delay to ensure message is sent
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Otherwise reconnect and try again
    else {
      console.log(`Reconnecting...`);
      this.connection = null;
      this.isConnected = false;
      this.connect();
      await this.waitForConnection();
      return this.sendMessage(topic, value);
    }
  }

  // Wait for connection to be established
  async waitForConnection(timeoutMs = 5000) {
    const startTime = Date.now();
    
    while (!this.isConnected || this.connection.readyState !== WebSocket.OPEN) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Timeout waiting for connection');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Read last value from channel (returns the value directly, or null if no messages)
  readMessage() {
    if (this.receivedValues.length === 0) {
      return null;
    }
    
    // Get the first value (FIFO)
    return this.receivedValues.shift();
  }

  // Check if there are any unread values
  hasMessages() {
    return this.receivedValues.length > 0;
  }

  // Get count of unread values
  messageCount() {
    return this.receivedValues.length;
  }

  // Peek at the next value without removing it
  peekMessage() {
    if (this.receivedValues.length === 0) {
      return null;
    }
    return this.receivedValues[0];
  }

  // Clear all received values
  clearMessages() {
    this.receivedValues = [];
  }

  // Wait for a message to arrive (with timeout)
  async waitForMessage(timeoutMs = 5000) {
    const startTime = Date.now();
    
    while (this.receivedValues.length === 0) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Timeout waiting for message');
      }
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.readMessage();
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

// Add Blockly block for waiting for message
Blockly.Blocks['wait_for_channel_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Wait for channel message");
    this.setOutput(true, null);
    this.setColour(340);
    this.setTooltip("Wait for a message from the channel (blocks until message arrives)");
  }
};

Blockly.JavaScript.forBlock['wait_for_channel_message'] = function(block, generator) {
  var code = `(await window.channelManager.waitForMessage())`;
  return [code, Blockly.JavaScript.ORDER_AWAIT];
};

// Delay/Wait block
Blockly.Blocks['wait_seconds'] = {
  init: function() {
    this.appendValueInput("DURATION")
        .setCheck("Number")
        .appendField("Wait");
    this.appendDummyInput()
        .appendField("seconds");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(340);
    this.setTooltip("Pause execution for specified seconds");
  }
};

Blockly.JavaScript.forBlock['wait_seconds'] = function(block, generator) {
  var duration = generator.valueToCode(block, 'DURATION', Blockly.JavaScript.ORDER_ATOMIC) || '1';
  var code = `await new Promise(resolve => setTimeout(resolve, ${duration} * 1000));\n`;
  return code;
};