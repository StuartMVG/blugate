var net = require('net');
var noble = require('noble');
var BluetoothHciSocket = require('bluetooth-hci-socket');

var port = 5683;
var host = 'device.spark.io';

var bleDis = false;
var cloudConnect = false;

var client = net.createConnection({port: port, host: host}, () => {
  console.log('Connected to Particle Cloud!');
  cloudConnect = true;
});

var bluetoothHciSocket = new BluetoothHciSocket();

//Data from cloud is fed to the Bluz
client.on('data', function(data) {
  if (bleDis == true){
    console.log("Cloud => Bluz");
    cloudToBluz(data);
  }
});

//Data from the Bluz is fed to the Cloud
bluetoothHciSocket.on('data', function(data) {
  if (bleDis == true && cloudConnect == true){
    console.log('Bluz => Cloud');
    bluzToCloud(data);
  } else if (bleDis == true && cloudConnect == false){
    console.log('Bluz => Cloud');
    cloudReconnect();
    bluzToCloud(data);
  }
});


client.on('end', function() {
  console.log('Cloud connection sleeping');
});

client.on('close', function() {
  console.log('Cloud connection ended');
  cloudConnect = false;
  cloudReconnect();
});

bluetoothHciSocket.on('error', function(error) {
  // TODO: non-BLE adaptor

  if (error.message === 'Operation not permitted') {
    console.log('state = unauthorized');
  } else if (error.message === 'Network is down') {
    console.log('state = powered off');
  } else {
    console.error(error);
  }
});


////////////////////////////////////////////////////////////////////////////////
/* Functions */
////////////////////////////////////////////////////////////////////////////////
function bluzToCloud (data) {
  console.log('Data from Bluz: ' + data.toString('hex') + "\t Data Length: " + data.length);
  //client.write(data);
}

function cloudToBluz (data) {
  console.log('Data from Cloud: ' + data.toString('Hex') + "\t Data Length: " + data.length);
  //bluetoothHciSocket.write(data);
}

function cloudReconnect () {
  client.connect({port: port, host: host}, () => {
    console.log("Cloud Reconnected");
  });
  cloudConnect = true;
}


////////////////////////////////////////////////////////////////////////////////
/* This is using Noble to start the Bluetooth process to start to look for devices */
////////////////////////////////////////////////////////////////////////////////

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  console.log("\n Found a Node - Address:", peripheral.address, "\t ID:", peripheral.id, "\n");
  bleDis = true;
});

noble.on('scanStart', function() {
  console.log('on -> scanStart');
  /*
  setTimeout(function() {
  noble.stopScanning();
}, 10 * 1000);
*/
});

noble.on('scanStop', function() {
  console.log('on -> scanStop');
});

////////////////////////////////////////////////////////////////////////////////


var HCI_COMMAND_PKT = 0x01;
var HCI_ACLDATA_PKT = 0x02;
var HCI_EVENT_PKT = 0x04;

var EVT_CMD_COMPLETE = 0x0e;
var EVT_CMD_STATUS = 0x0f;
var EVT_LE_META_EVENT = 0x3e;

var EVT_LE_ADVERTISING_REPORT = 0x02;

var OGF_LE_CTL = 0x08;
var OCF_LE_SET_SCAN_PARAMETERS = 0x000b;
var OCF_LE_SET_SCAN_ENABLE = 0x000c;


var LE_SET_SCAN_PARAMETERS_CMD = OCF_LE_SET_SCAN_PARAMETERS | OGF_LE_CTL << 10;
var LE_SET_SCAN_ENABLE_CMD = OCF_LE_SET_SCAN_ENABLE | OGF_LE_CTL << 10;

var HCI_SUCCESS = 0;

function setFilter() {
var filter = new Buffer(255);


var typeMask = (1 << HCI_EVENT_PKT);
var eventMask1 = (1 << EVT_CMD_COMPLETE) | (1 << EVT_CMD_STATUS);
var eventMask2 = (1 << (EVT_LE_META_EVENT - 32));
var opcode = 0;

filter.writeUInt32LE(typeMask, 0);
filter.writeUInt32LE(eventMask1, 4);
filter.writeUInt32LE(eventMask2, 8);
filter.writeUInt16LE(opcode, 12);


bluetoothHciSocket.setFilter(filter);
}

bluetoothHciSocket.bindRaw();
setFilter();
bluetoothHciSocket.start();
