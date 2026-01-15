
// Reference to output div
let outputDiv = document.getElementById('output');

// Set up callback for received data
bleManager.onDataReceived = (hexString, byteArray) => {
  outputDiv.textContent += `📥 Received: ${hexString}\n`;
  console.log('Received bytes:', byteArray);
};

// Set up callback for connection changes
bleManager.onConnectionChange = (connected, device, error) => {
  if (connected) {
    outputDiv.textContent += `✅ Connected to: ${device.name || 'Unknown'}\n`;
    outputDiv.textContent += `📡 Continuous reading started\n\n`;
  } else if (error) {
    outputDiv.textContent += `❌ Connection error: ${error.message}\n`;
  } else {
    outputDiv.textContent += `⚠️ Disconnected\n`;
  }
};



// Define custom API call block
Blockly.Blocks['api_call'] = {
  init: function() {
    this.appendValueInput("URL")
        .setCheck("String")
        .appendField("call API");
    this.appendDummyInput()
        .appendField("and store result in")
        .appendField(new Blockly.FieldVariable("response"), "VAR");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip("Make an API call and store the response");
  }
};

// JavaScript code generator for API block
Blockly.JavaScript.forBlock['api_call'] = function(block, generator) {
  var url = generator.valueToCode(block, 'URL', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var variable = generator.getVariableName(block.getFieldValue('VAR'));
  
  var code = variable + ' = await fetch(' + url + ').then(r => r.text());\n';
  return code;
};


// Define Serial receive/print block
Blockly.Blocks['serial_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("last Serial received value");
    this.setOutput(true, "String");
    this.setColour(230);
    this.setTooltip("Get the last value received from Serial device");
  }
};

// JavaScript code generator for Serial receive block
Blockly.JavaScript.forBlock['serial_received_value'] = function(block, generator) {
  var code = 'window.lastSerialValue || ""';
  return [code, Blockly.JavaScript.ORDER_ATOMIC];
};

// Define Serial wait for response block
Blockly.Blocks['serial_wait_for_response'] = {
  init: function() {
    this.appendValueInput("TIMEOUT")
        .setCheck("Number")
        .appendField("wait for Serial response (timeout");
    this.appendDummyInput()
        .appendField("ms)");
    this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("then");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Wait for Serial data and execute blocks when received");
  }
};

// JavaScript code generator for Serial wait block
Blockly.JavaScript.forBlock['serial_wait_for_response'] = function(block, generator) {
  var timeout = generator.valueToCode(block, 'TIMEOUT', Blockly.JavaScript.ORDER_ATOMIC) || '5000';
  var statements = generator.statementToCode(block, 'DO');
  
  var code = `await waitForSerialResponse(${timeout}, () => {\n${statements}});\n`;
  return code;
};

// Initialize Serial Manager
const serialManager = new SerialManager();

// Set baud rate if needed (default is 115200)
// serialManager.setBaudRate(9600);

// Set up callback for received serial data
serialManager.onDataReceived = (data) => {
  window.lastSerialValue += data; // Append instead of replace
  outputDiv.textContent += `📥 Serial: ${data}`;
  console.log('Serial received:', data);
  
  // Trigger any waiting promises
  if (window.serialResponseResolve) {
    window.serialResponseResolve(data);
    window.serialResponseResolve = null;
  }
};

// Set up callback for serial connection changes
serialManager.onConnectionChange = (connected, port, error) => {
  if (connected) {
    outputDiv.textContent += `✅ Serial Connected\n`;
  } else if (error) {
    outputDiv.textContent += `❌ Serial connection error: ${error.message}\n`;
  } else {
    outputDiv.textContent += `⚠️ Serial Disconnected\n`;
  }
};

// Serial button handler
document.getElementById('serialButton').addEventListener('click', async function() {
  try {
    if (serialManager.isConnected()) {
      // Disconnect if already connected
      await serialManager.disconnect();
    } else {
      // Connect
      outputDiv.textContent = '🔍 Opening serial port...\n';
      await serialManager.connect();
    }
  } catch (error) {
    outputDiv.textContent += `Error: ${error.message}\n`;
    console.error('Serial Error:', error);
  }
});



async function sendSerialCommand(data) {
  try {
    const commandWithNewline = data + '\r\n';
    const result = await serialManager.write(commandWithNewline);
    outputDiv.textContent += `📤 Serial Sent: ${result.sent}`;
    await serialManager.waitForPrompt(5000);


    return result;
  } catch (error) {
    outputDiv.textContent += `Serial send error: ${error.message}\n`;
    throw error;
  }
}
// JavaScript code generator for Serial send block
Blockly.JavaScript.forBlock['serial_send'] = function(block, generator) {
  var data = generator.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var code = 'await sendSerialCommand(' + data + ');\n';
  return code;
};


//Milan's custom code for Smart Motor 
Blockly.Blocks['initialize_motor'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialize Motor");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Send a command to the connected Serial device");
  }
};

Blockly.JavaScript.forBlock['initialize_motor'] = function(block, generator) {
  var code = `
    await sendSerialCommand("import servo");
    await sendSerialCommand("from machine import Pin");
    await sendSerialCommand("servo = servo.Servo(Pin(2))");
  `;
  return code;
};




Blockly.Blocks['move_motor'] = {
  init: function() {
    this.appendValueInput("ANGLE")
        .setCheck("Number")
        .appendField("Move motor to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("move motor to specified position");
  }
};

Blockly.JavaScript.forBlock['move_motor'] = function(block, generator) {
  var angle = generator.valueToCode(block, 'ANGLE', Blockly.JavaScript.ORDER_ATOMIC) || '0';

  var code = `
    await sendSerialCommand("servo.write_angle(" + ${angle} + ")");
`;

  return code;
};


Blockly.Blocks['initialize_sensor'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialize Sensor");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Send a command to the connected Serial device");
  }
};

Blockly.JavaScript.forBlock['initialize_sensor'] = function(block, generator) {
  var code = `
    await sendSerialCommand("import sensors");
    await sendSerialCommand("sens = sensors.SENSORS()");
  `;
  return code;
};


Blockly.Blocks['read_device'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("read")
        .appendField(new Blockly.FieldDropdown([
          ["sensor", "sensor"],
          ["potentiometer", "potentiometer"]
        ]), "DEVICE");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("Read value from device");
  }
};

Blockly.JavaScript.forBlock['read_device'] = function(block, generator) {
  var device = block.getFieldValue('DEVICE');
  var method = (device === 'sensor') ? 'readlight' : 'readpot';
  
  var code = `(await sendSerialCommandAndGetResult("sens.${method}()"))`;
  return [code, Blockly.JavaScript.ORDER_AWAIT];
};


Blockly.Blocks['initialize_screen'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Initialize Screen");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Send a command to the connected Serial device");
  }
};


Blockly.JavaScript.forBlock['initialize_screen'] = function(block, generator) {
  var code = `
    await sendSerialCommand("import icons");
    await sendSerialCommand("from machine import SoftI2C, Pin");
    await sendSerialCommand("i2c = SoftI2C(scl = Pin(7), sda = Pin(6))");
    await sendSerialCommand("display = icons.SSD1306_SMART(128, 64, i2c)");
  `;
  return code;
};

Blockly.Blocks['display_character'] = {
  init: function() {
      this.appendDummyInput()
        .appendField("Display text at");
    this.appendValueInput("X")
        .setCheck("Number")
        .appendField("x:");
    this.appendValueInput("Y")
        .setCheck("Number")
        .appendField("y:");
    this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("text:");
    this.appendValueInput("color")
        .setCheck("Number")
        .appendField("color:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("display text at specified position on screen");
  }
};

Blockly.JavaScript.forBlock['display_character'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var text = generator.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var color = generator.valueToCode(block, 'color', Blockly.JavaScript.ORDER_ATOMIC) || '0';
var code = `
  await sendSerialCommand("display.text(\\"" + ${text} + "\\", " + ${x} + ", " + ${y} + ", " + ${color} + ")");
  await sendSerialCommand("display.show()");
`;

  return code;
};


Blockly.Blocks['display_rectangle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Draw rectangle at");
    this.appendValueInput("X")
        .setCheck("Number")
        .appendField("x:");
    this.appendValueInput("Y")
        .setCheck("Number")
        .appendField("y:");
    this.appendValueInput("WIDTH")
        .setCheck("Number")
        .appendField("width:");
    this.appendValueInput("HEIGHT")
        .setCheck("Number")
        .appendField("height:");
    this.appendValueInput("color")
        .setCheck("Number")
        .appendField("color:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("display rectangle at specified position on screen");
  }
};

Blockly.JavaScript.forBlock['display_rectangle'] = function(block, generator) {
  var x = generator.valueToCode(block, 'X', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var y = generator.valueToCode(block, 'Y', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var width = generator.valueToCode(block, 'WIDTH', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var height = generator.valueToCode(block, 'HEIGHT', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var color = generator.valueToCode(block, 'color', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var code = `
    await sendSerialCommand("display.rect(" + ${x} + ", " + ${y} + ", " + ${width} + ", " + ${height} + ", " + ${color} + ")");
    await sendSerialCommand("display.show()");
  `;
  return code;
};

// Initialize Channel Block
/*
Blockly.Blocks['initialize_channel'] = {
  init: function() {
    this.appendValueInput("CHANNEL_NAME")
        .setCheck("String")
        .appendField("Initialize Channel with name");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Initialize Channel with specified name");
  }
};

Blockly.JavaScript.forBlock['initialize_channel'] = function(block, generator) {
  var channelName = generator.valueToCode(block, 'CHANNEL_NAME', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var code = `
    if (!window.channels) window.channels = {};
    window.channels[${channelName}] = { messages: [] };
  `;
  return code;
};

// Helper function to get all channel names from workspace
function getChannelNames() {
  var channels = [];
  var blocks = workspace.getAllBlocks();
  
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'initialize_channel') {
      // Try to get the channel name from the connected text block
      var nameBlock = blocks[i].getInputTargetBlock('CHANNEL_NAME');
      if (nameBlock && nameBlock.type === 'text') {
        var channelName = nameBlock.getFieldValue('TEXT');
        if (channelName) {
          channels.push([channelName, channelName]);
        }
      }
    }
  }
  
  // Return at least one option if no channels found
  return channels.length > 0 ? channels : [['No channels', 'none']];
}

// Send Channel Message Block with dynamic dropdown
Blockly.Blocks['send_channel_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Send to channel")
        .appendField(new Blockly.FieldDropdown(function() {
          return getChannelNames();
        }), "CHANNEL");
    this.appendValueInput("MESSAGE")
        .setCheck("String")
        .appendField("message:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Send message to the Channel");
  }
};

Blockly.JavaScript.forBlock['send_channel_message'] = function(block, generator) {
  var channel = block.getFieldValue('CHANNEL');
  var message = generator.valueToCode(block, 'MESSAGE', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  
  var code = `
    if (window.channels && window.channels["${channel}"]) {
      window.channels["${channel}"].messages.push(${message});
      outputDiv.textContent += '📤 Channel [${channel}]: ' + ${message} + '\\n';
    }
  `;
  return code;
};

// Read Channel Message Block with dynamic dropdown
Blockly.Blocks['read_channel_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Read from channel")
        .appendField(new Blockly.FieldDropdown(function() {
          return getChannelNames();
        }), "CHANNEL");
    this.setOutput(true, "String");
    this.setColour(230);
    this.setTooltip("Read message from the Channel");
  }
};

Blockly.JavaScript.forBlock['read_channel_message'] = function(block, generator) {
  var channel = block.getFieldValue('CHANNEL');
  
  var code = `(window.channels && window.channels["${channel}"] && window.channels["${channel}"].messages.length > 0 ? window.channels["${channel}"].messages.shift() : "")`;
  return [code, Blockly.JavaScript.ORDER_CONDITIONAL];
};
*/



// Connect to Channel Block (simplified - no input needed)
Blockly.Blocks['connect_channel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Connect to Channel");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(340);
    this.setTooltip("Connect to hackathon WebSocket channel");
  }
};

Blockly.JavaScript.forBlock['connect_channel'] = function(block, generator) {
  var code = `window.channelManager.connect();\n`;
  return code;
};

// Send Channel Message Block
Blockly.Blocks['send_channel_message'] = {
  init: function() {
    this.appendValueInput("TOPIC")
        .setCheck("String")
        .appendField("Send to channel, topic:");
    this.appendValueInput("VALUE")
        .appendField("value:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(340);
    this.setTooltip("Send message to hackathon channel");
  }
};

Blockly.JavaScript.forBlock['send_channel_message'] = function(block, generator) {
  var topic = generator.valueToCode(block, 'TOPIC', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var value = generator.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  
  var code = `window.channelManager.sendMessage(${topic}, ${value});\n`;
  return code;
};

// Read Channel Message Block
Blockly.Blocks['read_channel_message'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Read message from channel");
    this.setOutput(true, null);
    this.setColour(340);
    this.setTooltip("Read message from hackathon channel (returns object with topic and value)");
  }
};

Blockly.JavaScript.forBlock['read_channel_message'] = function(block, generator) {
  var code = `window.channelManager.readMessage()`;
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};


// Toolbox with all features
const toolbox = {
  "kind": "categoryToolbox",
  "contents": [
    {
      "kind": "category",
      "name": "Logic",
      "colour": "210",
      "contents": [
        {
          "kind": "block",
          "type": "controls_if"
        },
        {
          "kind": "block",
          "type": "controls_ifelse"
        },
        {
          "kind": "block",
          "type": "logic_compare"
        },
        {
          "kind": "block",
          "type": "logic_operation"
        },
        {
          "kind": "block",
          "type": "logic_negate"
        },
        {
          "kind": "block",
          "type": "logic_boolean"
        },
        {
          "kind": "block",
          "type": "logic_null"
        },
        {
          "kind": "block",
          "type": "logic_ternary"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Loops",
      "colour": "120",
      "contents": [
        {
          "kind": "block",
          "type": "controls_repeat_ext"
        },
        {
          "kind": "block",
          "type": "controls_whileUntil"
        },
        {
          "kind": "block",
          "type": "controls_for"
        },
        {
          "kind": "block",
          "type": "controls_forEach"
        },
        {
          "kind": "block",
          "type": "controls_flow_statements"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Math",
      "colour": "230",
      "contents": [
        {
          "kind": "block",
          "type": "math_number"
        },
        {
          "kind": "block",
          "type": "math_arithmetic"
        },
        {
          "kind": "block",
          "type": "math_single"
        },
        {
          "kind": "block",
          "type": "math_trig"
        },
        {
          "kind": "block",
          "type": "math_constant"
        },
        {
          "kind": "block",
          "type": "math_number_property"
        },
        {
          "kind": "block",
          "type": "math_round"
        },
        {
          "kind": "block",
          "type": "math_on_list"
        },
        {
          "kind": "block",
          "type": "math_modulo"
        },
        {
          "kind": "block",
          "type": "math_constrain"
        },
        {
          "kind": "block",
          "type": "math_random_int"
        },
        {
          "kind": "block",
          "type": "math_random_float"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Text",
      "colour": "160",
      "contents": [
        {
          "kind": "block",
          "type": "text"
        },
        {
          "kind": "block",
          "type": "text_join"
        },
        {
          "kind": "block",
          "type": "text_append"
        },
        {
          "kind": "block",
          "type": "text_length"
        },
        {
          "kind": "block",
          "type": "text_isEmpty"
        },
        {
          "kind": "block",
          "type": "text_indexOf"
        },
        {
          "kind": "block",
          "type": "text_charAt"
        },
        {
          "kind": "block",
          "type": "text_getSubstring"
        },
        {
          "kind": "block",
          "type": "text_changeCase"
        },
        {
          "kind": "block",
          "type": "text_trim"
        },
        {
          "kind": "block",
          "type": "text_print"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Lists",
      "colour": "260",
      "contents": [
        {
          "kind": "block",
          "type": "lists_create_with"
        },
        {
          "kind": "block",
          "type": "lists_create_empty"
        },
        {
          "kind": "block",
          "type": "lists_repeat"
        },
        {
          "kind": "block",
          "type": "lists_length"
        },
        {
          "kind": "block",
          "type": "lists_isEmpty"
        },
        {
          "kind": "block",
          "type": "lists_indexOf"
        },
        {
          "kind": "block",
          "type": "lists_getIndex"
        },
        {
          "kind": "block",
          "type": "lists_setIndex"
        },
        {
          "kind": "block",
          "type": "lists_getSublist"
        },
        {
          "kind": "block",
          "type": "lists_split"
        },
        {
          "kind": "block",
          "type": "lists_sort"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Variables",
      "colour": "330",
      "custom": "VARIABLE"
    },
    {
      "kind": "category",
      "name": "Functions",
      "colour": "290",
      "custom": "PROCEDURE"
    },
    {
      "kind": "category",
      "name": "API",
      "colour": "20",
      "contents": [
        {
          "kind": "block",
          "type": "api_call"
        }
      ]
    },
{
      "kind": "category",
      "name": "Serial",
      "colour": "30",
      "contents": [
        {
          "kind": "block",
          "type": "serial_send"
        },
        {
          "kind": "block",
          "type": "serial_received_value"
        },
        {
          "kind": "block",
          "type": "serial_wait_for_response"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Smart Motor",
      "colour": "10",
      "contents": [
        {
          "kind": "block",
          "type": "initialize_motor"
        },
        {
          "kind": "block",
          "type": "move_motor"
        },
        {
          "kind": "block",
          "type": "initialize_screen"
        },
        {
          "kind": "block",
          "type": "initialize_sensor"
        },
        {
          "kind": "block",
          "type": "display_character"
        },
        {
          "kind": "block",
          "type": "display_rectangle"
        },
        {      
          "kind": "block",
          "type": "read_device"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Channels",
      "colour": "12",
      "contents": [
        {
          "kind": "block",
          "type": "connect_channel"
        },
        {
          "kind": "block",
          "type": "send_channel_message"
        },
        {
          "kind": "block",
          "type": "read_channel_message"
        }
      ]
      }
  ]
};

// Function to send command and get numeric result
async function sendSerialCommandAndGetResult(command) {
  try {
    // Clear buffer before sending
    window.lastSerialValue = '';
    
    const commandWithNewline = command + '\r\n';
    await serialManager.write(commandWithNewline);
    outputDiv.textContent += `📤 Serial Sent: ${command}\n`;
    
    // Wait for the prompt
    await serialManager.waitForPrompt(5000);
    
    // Extract the number from the received data
    // The response might look like "1118\r\n>>>"
    const match = window.lastSerialValue.match(/\d+/);
    const result = match ? parseInt(match[0]) : 0;
    
    console.log('Extracted result:', result);
    return result;
    
  } catch (error) {
    outputDiv.textContent += `Serial error: ${error.message}\n`;
    throw error;
  }
}

// Inject Blockly
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox,
  scrollbars: true,
  trashcan: true
});

// Run button
document.getElementById('runButton').addEventListener('click', async function() {
  outputDiv.textContent = '';
  
  // Initialize the JavaScript generator
  Blockly.JavaScript.init(workspace);
  const code = Blockly.JavaScript.workspaceToCode(workspace);
  
  if (!code.trim()) {
    outputDiv.textContent = 'No blocks to run!';
    return;
  }
  
  // Wrap in async function and replace window.alert with custom output
  const wrappedCode = `
    (async function() {
      window.alert = function(msg) {
        outputDiv.textContent += msg + '\\n';
      };
      ${code}
    })();
  `;
  
  try {
    await eval(wrappedCode);
    if (outputDiv.textContent === '') {
      outputDiv.textContent = 'Code executed successfully!';
    }
  } catch (error) {
    outputDiv.textContent = 'Error: ' + error.message;
  }
});


// Store last received Serial value
window.lastSerialValue = '';

// Update the Serial callback to store the last value
serialManager.onDataReceived = (data) => {
  window.lastSerialValue = data; // Store for block access
  outputDiv.textContent += `📥 Serial: ${data}`;
  console.log('Serial received:', data);
  
  // Trigger any waiting promises
  if (window.serialResponseResolve) {
    window.serialResponseResolve(data);
    window.serialResponseResolve = null;
  }
};

// Wait for Serial response function
async function waitForSerialResponse(timeout, callback) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      window.serialResponseResolve = null;
      reject(new Error('Serial response timeout'));
    }, timeout);
    
    window.serialResponseResolve = (data) => {
      clearTimeout(timeoutId);
      if (callback) {
        callback();
      }
      resolve(data);
    };
  });
}
