// serial.js - Web Serial API Communication Module

class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readableStreamClosed = null;
    this.writableStreamClosed = null;
    this.onDataReceived = null;
    this.onConnectionChange = null;
    this.baudRate = 115200; // Default baud rate
    this.receivedBuffer = '';
  }

  // Check if Web Serial API is available
  isAvailable() {
    return 'serial' in navigator;
  }

  // Check if connected
  isConnected() {
    return this.port !== null && this.port.readable !== null;
  }

  // Set baud rate
  setBaudRate(rate) {
    this.baudRate = rate;
  }

  // Connect to serial device
  async connect() {
    try {
      if (!this.isAvailable()) {
        throw new Error('Web Serial API is not available in this browser. Please use Chrome, Edge, or Opera.');
      }

      // Request a port
      this.port = await navigator.serial.requestPort();

      // Open the port
      await this.port.open({ baudRate: this.baudRate });

      // Set up writer
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Set up reader
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      // Start reading
      this.startReading();

      if (this.onConnectionChange) {
        this.onConnectionChange(true, this.port);
      }

      return {
        success: true,
        port: this.port
      };

    } catch (error) {
      if (this.onConnectionChange) {
        this.onConnectionChange(false, null, error);
      }
      throw error;
    }
  }

  // Disconnect from serial device
  async disconnect() {
    try {
      if (this.reader) {
        await this.reader.cancel();
        await this.readableStreamClosed.catch(() => {});
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.close();
        await this.writableStreamClosed;
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      if (this.onConnectionChange) {
        this.onConnectionChange(false, null);
      }

      return { success: true };

    } catch (error) {
      throw error;
    }
  }



async startReading() {
    try {
      while (true) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value) {
          // Accumulate data in buffer
          this.receivedBuffer += value;
          
          // Check if we have the complete prompt in the buffer
          if (this.receivedBuffer.includes('>>>') && this.promptReceivedCallback) {
            this.promptReceivedCallback();
            this.promptReceivedCallback = null;
            this.receivedBuffer = ''; // Clear buffer after finding prompt
          }
          
          if (this.onDataReceived) {
            this.onDataReceived(value);
          }
        }
      }
    } catch (error) {
      console.error('Serial read error:', error);
      if (this.onConnectionChange) {
        this.onConnectionChange(false, null, error);
      }
    }
  }

  // Wait for >>> prompt
  async waitForPrompt(timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.promptReceivedCallback = null;
        reject(new Error('Timeout waiting for MicroPython prompt'));
      }, timeout);

      this.promptReceivedCallback = () => {
        clearTimeout(timeoutId);
        resolve();
      };
    });
  }




  // Write string to serial port
  async write(data) {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to serial device');
      }

      await this.writer.write(data);

      return {
        success: true,
        sent: data
      };

    } catch (error) {
      throw error;
    }
  }

  // Write bytes to serial port
  async writeBytes(bytes) {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to serial device');
      }

      // Convert to Uint8Array if needed
      const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      
      // Create a writer for raw bytes
      const writer = this.port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();

      return {
        success: true,
        sent: Array.from(data)
      };

    } catch (error) {
      throw error;
    }
  }

  // Helper: Convert hex string to bytes and send
  async writeHex(hexString) {
    const cleanHex = hexString.replace(/[^0-9A-Fa-f]/g, '');
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    return await this.writeBytes(bytes);
  }
}

// Export for use in other files
window.SerialManager = SerialManager;