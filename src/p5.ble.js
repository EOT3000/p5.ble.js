// Copyright (c) 2018 p5ble
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import callCallback from './utils/callcallback';
import parseData from './utils/parseData';

class p5ble {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristics = [];
    this.handleNotifications = null;
  }

  connect(serviceUuidOrOptions, callback) {
    // default values:
    let serviceUuid = 0x0000;
    let options = { filters: [{ services: [serviceUuidOrOptions] }] };

    // also possible: options = { filters: [{ namePrefix: "name" }]}
    if (typeof serviceUuidOrOptions === typeof options) {
      options = serviceUuidOrOptions;
    } else {
      serviceUuid = serviceUuidOrOptions;
    }

    console.log('Requesting Bluetooth Device...');

    return callCallback(navigator.bluetooth.requestDevice(options)
      .then((device) => {
        this.device = device;
        console.log(`Got device ${device.name}`);
        return device.gatt.connect();
      })
      .then((server) => {
        this.server = server;
        console.log('Getting Service...');
        return server.getPrimaryService(serviceUuid);
      })
      .then((service) => {
        this.service = service;
        console.log('Getting Characteristics...');
        return service.getCharacteristics();
      })
      .then((characteristics) => {
        this.characteristics = characteristics;
        console.log('Got Characteristic');
        return characteristics;
      })
      .catch((error) => {
        console.error(`Error: ${error}`);
      }), callback);
  }

  async read(characteristic, dataTypeOrcallback, cb) {
    let callback;
    let dataType;
    if (typeof dataTypeOrcallback === 'function') {
      callback = dataTypeOrcallback;
    } else if (typeof dataTypeOrcallback === 'string') {
      dataType = dataTypeOrcallback;
    }
    if (typeof cb === 'function') {
      callback = cb;
    }

    if (!characteristic || !characteristic.uuid) console.error('The characteristic does not exist.');
    const validChar = this.characteristics.find(char => char.uuid === characteristic.uuid);
    if (!validChar) return console.error('The characteristic does not exist.');

    return callCallback(characteristic.readValue()
      .then(value => parseData(value, dataType)), callback);
  }

  write(characteristic, inputValue) {
    if (!characteristic || !characteristic.uuid) console.error('The characteristic does not exist.');
    const validChar = this.characteristics.find(char => char.uuid === characteristic.uuid);
    if (!validChar) return console.error('The characteristic does not exist.');

    const bufferToSend = Uint8Array.of(inputValue);
    console.log(`Writing ${inputValue} to Characteristic...`);
    return characteristic.writeValue(bufferToSend);
  }

  async startNotifications(characteristic, handleNotifications, dataType) {
    if (!characteristic || !characteristic.uuid) console.error('The characteristic does not exist.');
    const validChar = this.characteristics.find(char => char.uuid === characteristic.uuid);
    if (!validChar) return console.error('The characteristic does not exist.');

    await characteristic.startNotifications();

    console.log('> Notifications started');

    this.handleNotifications = (event) => {
      const { value } = event.target;
      const parsedData = parseData(value, dataType);
      handleNotifications(parsedData);
    };

    return characteristic.addEventListener('characteristicvaluechanged', this.handleNotifications);
  }

  async stopNotifications(characteristic) {
    if (!characteristic || !characteristic.uuid) console.error('The characteristic does not exist.');
    const validChar = this.characteristics.find(char => char.uuid === characteristic.uuid);
    if (!validChar) return console.error('The characteristic does not exist.');

    try {
      await characteristic.stopNotifications();

      if (this.handleNotifications) {
        console.log('> Notifications stopped');
        return characteristic.removeEventListener('characteristicvaluechanged', this.handleNotifications);
      }
      return console.log('> Notifications stopped');
    } catch (error) {
      return console.error(`Error: ${error}`);
    }
  }

  disconnect() {
    if (!this.device) return;
    console.log('Disconnecting from Bluetooth Device...');
    if (this.device.gatt.connected) {
      this.device.gatt.disconnect();
    } else {
      console.log('> Bluetooth Device is already disconnected');
    }
  }

  onDisconnected(handleDisconnected) {
    if (!this.device) return console.error('There is no device connected.');
    return this.device.addEventListener('gattserverdisconnected', handleDisconnected);
  }

  isConnected() {
    if (!this.device) return false;
    if (this.device.gatt.connected) {
      return true;
    }
    return false;
  }
}

module.exports = p5ble;
