// ble.js - Bluetooth Low Energy Communication Module

class BLEManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.serviceUUID = null;
    this.txCharUUID = null;
    this.rxCharUUID = null;
    this.onDataReceived = null;
    this.onConnectionChange = null;
  }

  // Initialize with UUIDs
  setUUIDs(serviceUUID, txCharUUID, rxCharUUID) {
    this.serviceUUID = serviceUUID;
    this.txCharUUID = txCharUUID;
    this.rxCharUUID = rxCharUUID;
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
  async connect(filters = null) {
    try {
      if (!this.isAvailable()) {
        throw new Error('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.');
      }

      // Default filters if none provided
      const requestOptions = filters || {
        filters: [{ services: [this.serviceUUID] }],
        optionalServices: [this.serviceUUID]
      };

      // Request device
      this.device = await navigator.bluetooth.requestDevice(requestOptions);

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Set up disconnect handler
      this.device.addEventListener('gattserverdisconnected', () => {
        this.onDisconnect();
      });

      // Auto-start notifications if RX characteristic is defined
      if (this.rxCharUUID) {
        await this.startNotifications();
      }

      if (this.onConnectionChange) {
        this.onConnectionChange(true, this.device);
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
      throw error;
    }
  }

  // Disconnect from device
  async disconnect() {
    try {
      if (this.device && this.device.gatt.connected) {
        await this.device.gatt.disconnect();
      }
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

  // Write hex data to device
  async write(hexData) {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Get service and characteristic
      const service = await this.server.getPrimaryService(this.serviceUUID);
      const characteristic = await service.getCharacteristic(this.txCharUUID);

      // Convert hex to bytes
      const dataToSend = this.hexToBytes(hexData);

      // Write data
      await characteristic.writeValue(dataToSend);

      return {
        success: true,
        sent: this.bytesToHex(dataToSend)
      };

    } catch (error) {
      throw error;
    }
  }

  // Read data once from device
  async read() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Get service and characteristic
      const service = await this.server.getPrimaryService(this.serviceUUID);
      const characteristic = await service.getCharacteristic(this.rxCharUUID);

      // Read value
      const value = await characteristic.readValue();
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

  // Start continuous notifications
  async startNotifications() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      // Get service and characteristic
      const service = await this.server.getPrimaryService(this.serviceUUID);
      const characteristic = await service.getCharacteristic(this.rxCharUUID);

      // Start notifications
      await characteristic.startNotifications();

      // Add event listener
      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        this.handleNotification(event);
      });

      return { success: true };

    } catch (error) {
      throw error;
    }
  }

  // Stop notifications
  async stopNotifications() {
    try {
      if (!this.isConnected()) {
        throw new Error('Not connected to BLE device');
      }

      const service = await this.server.getPrimaryService(this.serviceUUID);
      const characteristic = await service.getCharacteristic(this.rxCharUUID);

      await characteristic.stopNotifications();

      return { success: true };

    } catch (error) {
      throw error;
    }
  }

  // Handle incoming notifications
  handleNotification(event) {
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