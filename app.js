// Initialize BLE Manager
const bleManager = new BLEManager();

// Configure your UUIDs here - UPDATE THESE WITH YOUR DEVICE'S UUIDs
const SERVICE_UUID = '0000fd02-0000-1000-8000-00805f9b34fb';  // UPDATE THIS
const TX_CHAR_UUID = '0000fd02-0001-1000-8000-00805f9b34fb';  // UPDATE THIS (write to device)
const RX_CHAR_UUID = '0000fd02-0002-1000-8000-00805f9b34fb';  // UPDATE THIS (read from device)

bleManager.setUUIDs(SERVICE_UUID, TX_CHAR_UUID, RX_CHAR_UUID);

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

// BLE button handler
document.getElementById('bleButton').addEventListener('click', async function() {
  try {
    outputDiv.textContent = '🔍 Scanning for Bluetooth devices...\n';
    
    const result = await bleManager.connect();
    
  } catch (error) {
    outputDiv.textContent += `Error: ${error.message}\n`;
    console.error('BLE Error:', error);
  }
});

// Function to send BLE command (can be called from blocks or code)
async function sendBLECommand(hexCommand) {
  try {
    const result = await bleManager.write(hexCommand);
    outputDiv.textContent += `📤 Sent: ${result.sent}\n`;
    return result;
  } catch (error) {
    outputDiv.textContent += `Send error: ${error.message}\n`;
    throw error;
  }
}

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

// Define custom BLE send block
Blockly.Blocks['ble_send'] = {
  init: function() {
    this.appendValueInput("DATA")
        .setCheck("String")
        .appendField("send BLE command");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(210);
    this.setTooltip("Send a hex command to the connected BLE device");
  }
};

// JavaScript code generator for BLE send block
Blockly.JavaScript.forBlock['ble_send'] = function(block, generator) {
  var data = generator.valueToCode(block, 'DATA', Blockly.JavaScript.ORDER_ATOMIC) || '""';
  var code = 'await sendBLECommand(' + data + ');\n';
  return code;
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
      "name": "Bluetooth",
      "colour": "210",
      "contents": [
        {
          "kind": "block",
          "type": "ble_send"
        }
      ]
    }
  ]
};

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