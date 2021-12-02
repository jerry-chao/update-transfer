'use strict';

module.exports.uuid = function() {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    // eslint-disable-next-line no-bitwise
    const r = Math.random() * 16 | 0,
      // eslint-disable-next-line no-bitwise
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

module.exports.randomId = function() {
  const prefix = new Date().getTime();
  const subfix = Math.round(Math.random() * 9000000 + 999999);
  return prefix + '_' + subfix;
};
