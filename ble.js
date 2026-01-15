// ble.js - Bluetooth Low Energy Communication Module

class BLEManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.serviceUUID = null;
    this.txCharUUID = null;
    this.rxCharUUID = null;
    this.onDataReceived = null;
    this.onConnectionChange = null;
    this.handleNotification = null;
    this.hubInfo = null; // Will need to be set if using send() method
    this.packetSize = 20; // Default BLE packet size
  }

  // Initialize with UUIDs
  setUUIDs(serviceUUID, txCharUUID, rxCharUUID) {
    this.serviceUUID = serviceUUID;
    this.txCharUUID = txCharUUID;
    this.rxCharUUID = rxCharUUID;
  }

  // Set hub info for message packing (if needed)
  setHubInfo(hubInfo) {
    this.hubInfo = hubInfo;
  }

  // Set packet size for chunked sending
  setPacketSize(size) {
    this.packetSize = size;
  }

  // Check if Web Bluetooth is available
  isAvailable() {
    return 'bluetooth' in navigator;
  }

  // Check if connected
  isConnected() {
    return this.server && this.server.connected;
  }

  // Connect to BLE device
  async connect(filters = null, callback = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.');
      }

      // If device already exists (reconnecting), skip device selection
      if (!this.device) {
        // Default filters if none provided
        const requestOptions = filters || {
          filters: [{ services: [this.serviceUUID] }],
          optionalServices: [this.serviceUUID, 'generic_access', 'device_information']
        };

        // Request device
        this.device = await navigator.bluetooth.requestDevice(requestOptions);
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Get and cache service and characteristics (more efficient)
      this.service = await this.server.getPrimaryService(this.serviceUUID);
      this.writeCharacteristic = await this.service.getCharacteristic(this.txCharUUID);
      this.notifyCharacteristic = await this.service.getCharacteristic(this.rxCharUUID);

      // Set up disconnect handler
      this.device.addEventListener('gattserverdisconnected', () => {
        this.onDisconnect();
      });

      // Auto-start notifications
      await this.startNotifications();

      if (this.onConnectionChange) {
        this.onConnectionChange(true, this.device);
      }

      // Call custom callback if provided
      if (callback) {
        callback(true, this.device);
      }

      return {
        success: true,
        device: this.device,
        name: this.device.name || 'Unknown Device',
        id: this.device.id
      };

    } catch (error) {
      if (this.onConnectionChange) {
        this.onConnectionChange(false, null, error);
      }
      
      if (callback) {
        callback(false, null, error);
      }
      
      throw error;
    }
  }

  // Disconnect from device
  async disconnect() {
    try {
      if (this.device && this.device.gatt.connected) {
        await this.device.gatt.disconnect();
      }
      this.device = null;
      this.server = null;
      this.service = null;
      this.writeCharacteristic = null;
      this.notifyCharacteristic = null;
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Handle disconnect event
  onDisconnect() {
    if (this.onConnectionChange) {
      this.onConnectionChange(false, this.device);
    }
  }

  // Write hex data to device (optimized)
  async write(hexData) {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Convert hex to bytes
      const dataToSend = this.hexToBytes(hexData);

      // Use cached characteristic instead of fetching each time
      await this.writeCharacteristic.writeValue(dataToSend);

      return {
        success: true,
        sent: this.bytesToHex(dataToSend)
      };

    } catch (error) {
      throw error;
    }
  }

  // Advanced send method with struct packing and chunking
  async send(fmt, ID, val = null) {
    console.log('Format:', fmt, 'ID:', ID, 'Value:', val);
    
    let payload = [ID];
    
    if (val) {
      payload.push(...Object.values(val.values));
    }
    
    console.log('Payload values:', payload);
    
    // Pack the payload based on format
    const packedData = this.structPack(fmt, ...payload);
    
    // Pack message with hub info if available
    let message;
    if (this.hubInfo && typeof this.hubInfo.pack === 'function') {
      message = this.hubInfo.pack(packedData);
    } else {
      message = packedData;
    }
    
    const packet_size = this.packetSize;
    
    // Send in chunks
    for (let i = 0; i < message.length; i += packet_size) {
      const packet = message.slice(i, i + packet_size);
      console.log('Sending packet:', Array.from(packet));
      
      // Write packet
      await this.writeCharacteristic.writeValue(packet);
      
      // Small delay between packets to avoid overwhelming the device
      if (i + packet_size < message.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return {
      success: true,
      sent: this.bytesToHex(message)
    };
  }

  // Compact struct.pack equivalent
  structPack(fmt, ...values) {
    const littleEndian = fmt.startsWith('<');
    const format = fmt.replace('<', '').replace('>', '');
    
    // Map format chars to sizes
    const sizes = { 'b': 1, 'B': 1, 'h': 2, 'H': 2, 'i': 4, 'I': 4, 'f': 4, 'd': 8 };
    const size = [...format].reduce((sum, c) => sum + (sizes[c] || 0), 0);
    
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    
    let offset = 0;
    [...format].forEach((char, i) => {
      const value = values[i];
      
      switch(char) {
        case 'b': view.setInt8(offset, value); offset += 1; break;
        case 'B': view.setUint8(offset, value); offset += 1; break;
        case 'h': view.setInt16(offset, value, littleEndian); offset += 2; break;
        case 'H': view.setUint16(offset, value, littleEndian); offset += 2; break;
        case 'i': view.setInt32(offset, value, littleEndian); offset += 4; break;
        case 'I': view.setUint32(offset, value, littleEndian); offset += 4; break;
        case 'f': view.setFloat32(offset, value, littleEndian); offset += 4; break;
        case 'd': view.setFloat64(offset, value, littleEndian); offset += 8; break;
      }
    });
    
    return new Uint8Array(buffer);
  }

  // Struct unpack equivalent (for receiving data)
  structUnpack(fmt, buffer) {
    const littleEndian = fmt.startsWith('<');
    const format = fmt.replace('<', '').replace('>', '');
    
    const view = new DataView(buffer.buffer || buffer);
    const values = [];
    
    let offset = 0;
    [...format].forEach((char) => {
      switch(char) {
        case 'b': values.push(view.getInt8(offset)); offset += 1; break;
        case 'B': values.push(view.getUint8(offset)); offset += 1; break;
        case 'h': values.push(view.getInt16(offset, littleEndian)); offset += 2; break;
        case 'H': values.push(view.getUint16(offset, littleEndian)); offset += 2; break;
        case 'i': values.push(view.getInt32(offset, littleEndian)); offset += 4; break;
        case 'I': values.push(view.getUint32(offset, littleEndian)); offset += 4; break;
        case 'f': values.push(view.getFloat32(offset, littleEndian)); offset += 4; break;
        case 'd': values.push(view.getFloat64(offset, littleEndian)); offset += 8; break;
      }
    });
    
    return values;
  }

  // Read data once from device (optimized)
  async read() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Read value from cached characteristic
      const value = await this.notifyCharacteristic.readValue();
      const byteArray = new Uint8Array(value.buffer);
      const hexString = this.bytesToHex(byteArray);

      return {
        success: true,
        hex: hexString,
        bytes: byteArray
      };

    } catch (error) {
      throw error;
    }
  }

  // Start continuous notifications (optimized)
  async startNotifications() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Use cached characteristic
      await this.notifyCharacteristic.startNotifications();

      // Bind and add event listener
      this.handleNotification = this.handleNotificationEvent.bind(this);
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', 
        this.handleNotification);

      return { success: true };

    } catch (error) {
      throw error;
    }
  }

  // Stop notifications (optimized)
  async stopNotifications() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      await this.notifyCharacteristic.stopNotifications();
      
      if (this.handleNotification) {
        this.notifyCharacteristic.removeEventListener('characteristicvaluechanged', 
          this.handleNotification);
      }

      return { success: true };

    } catch (error) {
      throw error;
    }
  }

  // Handle incoming notifications
  handleNotificationEvent(event) {
    const value = event.target.value;
    const byteArray = new Uint8Array(value.buffer);
    const hexString = this.bytesToHex(byteArray);

    if (this.onDataReceived) {
      this.onDataReceived(hexString, byteArray);
    }
  }

  // Helper: Convert hex string to Uint8Array
  hexToBytes(hex) {
    if (hex instanceof Uint8Array) {
      return hex;
    }
    if (Array.isArray(hex)) {
      return new Uint8Array(hex);
    }

    // Remove spaces, 0x prefix, and other non-hex characters
    const cleanHex = hex.replace(/[^0-9A-Fa-f]/g, '');

    // Convert to byte array
    const bytes = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  }

  // Helper: Convert Uint8Array to hex string
  bytesToHex(bytes) {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  // Helper: Convert hex string to ASCII
  hexToAscii(hex) {
    const bytes = this.hexToBytes(hex);
    return new TextDecoder().decode(bytes);
  }

  // Helper: Convert ASCII to hex
  asciiToHex(ascii) {
    const bytes = new TextEncoder().encode(ascii);
    return this.bytesToHex(bytes);
  }
}

// Export for use in other files
window.BLEManager = BLEManager;