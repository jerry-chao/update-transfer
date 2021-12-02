'use strict';

const dayjs = require('dayjs');
const atob = require('atob');
// const TIMESSTAMP_FORMAY = 'YYYY-MM-DD HH:mm:ss,SSS';
const UTC_FORMAY = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
const fs = require('fs');
const CryptoJS = require('crypto-js');
const iv = CryptoJS.enc.Utf8.parse('ABCDEF1234123412');
const errorEnum = require('./enum').errorEnum;
const BizError = require('./error').BizError;


module.exports.getCurrentUTC = () => {
  return dayjs().format(UTC_FORMAY);
};

module.exports.success = (packageId, data) => {
  return {
    packageId,
    packageType: 'response',
    status: 'success',
    timestamp: dayjs().format(UTC_FORMAY),
    data,
  };
};

module.exports.fail = (packageId, { errorCode, errorReason }) => {
  return {
    packageId,
    packageType: 'response',
    status: 'fail',
    timestamp: dayjs().format(UTC_FORMAY),
    data: {
      errorCode,
      errorReason,
    },
  };
};

module.exports.uuid = () => {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    // eslint-disable-next-line no-bitwise
    const r = Math.random() * 16 | 0,
      // eslint-disable-next-line no-bitwise
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports.randomId = () => {
  const prefix = new Date().getTime();
  const subfix = Math.round(Math.random() * 9000000 + 999999);
  return prefix + '_' + subfix;
};

module.exports.randomEncryptionKey = () => {
  const obj = {
    // timestamp: new Date().getTime() + '',
    // deviceId: this.uuid(),
    key: this.uuid(),
  };
  let jsonString = JSON.stringify(obj);
  const remainder = jsonString.length % 4;
  for (let i = 0; i < 4 - remainder; i++) {
    jsonString += '0';
  }
  return jsonString;
};

module.exports.aesParseKey = key => {
  return CryptoJS.enc.Utf8.parse(key);
};

module.exports.aesDecrypt = (word, key) => {
  // const encryptedHexStr = CryptoJS.enc.Hex.parse(word);
  // const srcs = CryptoJS.enc.Base64.stringify(encryptedHexStr);
  // const decrypt = CryptoJS.AES.decrypt(srcs, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  // const decryptedStr = decrypt.toString(CryptoJS.enc.Utf8);
  // return decryptedStr.toString();

  const bytes = CryptoJS.AES.decrypt(word, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const originalText = bytes.toString(CryptoJS.enc.Utf8);
  return originalText;
};

module.exports.aesEncrypt = (word, key) => {
  // const srcs = CryptoJS.enc.Utf8.parse(word);
  // const encrypted = CryptoJS.AES.encrypt(srcs, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  // return encrypted.ciphertext.toString().toUpperCase();

  const ciphertext = CryptoJS.AES.encrypt(word, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
  return ciphertext;
};


module.exports.base64ToBlob = base64 => {
  const arr = base64.split(',');
  // const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return u8arr;
};

module.exports.getSize = str => {
  const strLength = str.length;
  let fileSizeMsg = '';
  if (strLength < 1048576) fileSizeMsg = (strLength / 1024).toFixed(2) + 'KB';
  else if (strLength === 1048576) fileSizeMsg = '1MB';
  else if (strLength > 1048576 && strLength < 1073741824) fileSizeMsg = (strLength / (1024 * 1024)).toFixed(2) + 'MB';
  else if (strLength > 1048576 && strLength === 1073741824) fileSizeMsg = '1GB';
  else if (strLength > 1073741824 && strLength < 1099511627776) fileSizeMsg = (strLength / (1024 * 1024 * 1024)).toFixed(2) + 'GB';
  else fileSizeMsg = '文件超过1TB';
  return fileSizeMsg;
};

module.exports.mkdir = (basepath, path) => {
  const arr = path.split('/');
  let dir = basepath;
  for (let i = 0; i < arr.length; i++) {
    if (!arr[i]) { continue; }
    dir = dir + '/' + arr[i];
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
  }
};


module.exports.validate = (validator, rule, data) => {
  const dataErrors = validator.validate(rule, data);
  if (dataErrors) {
    const errorCode = errorEnum.request_body_invalid.errorCode;
    const errorReason = dataErrors
      .map(x => {
        const { field, message } = x;
        return field + ' 字段' + message;
      })
      .join('; ');
    throw new BizError({ errorCode, errorReason });
  }
};

