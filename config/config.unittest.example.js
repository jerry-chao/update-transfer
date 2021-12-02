'use strict';

const assert = require('assert');

module.exports = appInfo => {

  assert(appInfo);

  return {
    isGenerateJsonFile: false,
    knex: {
      client: {
        dialect: 'mysql',
        connection: {
          host: '127.0.0.1',
          port: '3306',
          user: 'root',
          password: '123456',
          database: 'update-transfer',
        },
        pool: { min: 0, max: 5 },
        acquireConnectionTimeout: 30000,
      },
      app: true,
      agent: false,
    },
  };

};
