var net = require('net');
var noble = require('noble');

var port = 5683;
var host = 'device.spark.io';

var bluzUuid = '0ee78f83cc2a4b6ead4f707180d63c40';
var bluzServiceUuid = '871e022338ff77b1ed419fb3aa142db2'; //#define BLE_SCS_UUID_SERVICE 0x0223

var bluzNotifyUuid = '871e022438ff77b1ed419fb3aa142db2'; //#define BLE_SCS_UUID_DATA_UP_CHAR 0x0224
var bluzWriteUuid = '871e022538ff77b1ed419fb3aa142db2'; //#define BLE_SCS_UUID_DATA_DN_CHAR 0x0225

var bluzBase = 'B22D14AAB39F41EDB177FF38D8171E87';


var bluzService = null;
var bluzNotifyCharacteristic = null;
var bluzWriteCharacteristic = null;

var client = net.createConnection({port: port, host: host}, () => {
  console.log('Connected to Particle Cloud!');
})

client.on('end', function() {
  console.log('Cloud connection sleeping');
})

client.on('close', function() {
  console.log('Cloud connection ended');
  cloudReconnect();
})

////////////////////////////////////////////////////////////////////////////////
/* This is using Noble to start the Bluetooth process to start to look for devices */
////////////////////////////////////////////////////////////////////////////////

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
})

noble.on('discover', function(peripheral) {
  console.log("Found a BLE Device - Address:", peripheral.address, "   ID:", peripheral.id);

  peripheral.connect(function(error) {



      peripheral.discoverServices([bluzServiceUuid], function(err, services) {
        services.forEach(function(service) {

          console.log('\nfound service:', service.uuid);

          service.discoverCharacteristics([], function(err, characteristics) {
            characteristics.forEach(function(characteristic) {

              console.log('\nfound characteristic:', characteristic.uuid);

              if (bluzNotifyUuid == characteristic.uuid) {
                bluzNotifyCharacteristic = characteristic;
              }
              else if (bluzWriteUuid == characteristic.uuid) {
                bluzWriteCharacteristic = characteristic;
              }

              if (bluzNotifyCharacteristic && bluzWriteCharacteristic) {
                //function to start communication
                chitChat ();
              }
              else {
                console.log('missing characteristics');
              }

            })
          })
        })
      })

  })
})


////////////////////////////////////////////////////////////////////////////////
/* Functions */
////////////////////////////////////////////////////////////////////////////////

function chitChat (){
  console.log('Lets Chat!!!');


  bluzNotifyCharacteristic.read(function(error, data) {
    console.log('Read Bluz Data \n');
  })


  bluzNotifyCharacteristic.notify(true, function(err) {

  })

  bluzNotifyCharacteristic.on('data', function(data, isNotification) {
    console.log("Bluz => Cloud .. Inside chitChat");
    console.log(data.toString('hex') + '\n');
    //data = bluzBase + data;
    console.log('\t' + data.toString('hex') + '\n');
    client.write(data, true, function(err) {
      if (err) {
        console.log('error');
      } else {
        console.log('Success: Data sent to Cloud: ' + data.toString('hex') + "\t Data Length: " + data.length + "\n")
      }
    })
  })


  client.on('data', function(data) {
    console.log("Cloud => Bluz .. Inside chitChat");
    bluzWriteCharacteristic.write(data, true, function(err) {
      if (err) {
        console.log('error');
      } else {
        console.log('Success: Data sent to Bluz: ' + data.toString('hex') + "\t Data Length: " + data.length + "\n")
      }
    })
  })

}

function bluzToCloud (data) {
  console.log('Data from Bluz: ' + data.toString('hex') + "\t Data Length: " + data.length);
}

function cloudToBluz (data) {
  console.log('Data from Cloud: ' + data.toString('Hex') + "\t Data Length: " + data.length);
}

function cloudReconnect () {
  client.connect({port: port, host: host}, () => {
    console.log("Cloud Reconnected");
  });
}

////////////////////////////////////////////////////////////////////////////////

noble.on('scanStart', function() {
  console.log('on -> scanStart');
  setTimeout(function() {
    noble.stopScanning();
  }, 10 * 1000);

})

noble.on('scanStop', function() {
  console.log('on -> scanStop');
})
