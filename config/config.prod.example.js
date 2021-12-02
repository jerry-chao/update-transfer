'use strict';

const assert = require('assert');

module.exports = appInfo => {

  assert(appInfo);
  return {
    appDirectoryLink: 'https://sanwan.startalk.tech',
    static: {
      maxAge: 0,
      buffer: false,
      preload: false,
      maxFiles: 0,
    },
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
        pool: { min: 5, max: 100 },
        acquireConnectionTimeout: 30000,
      },
      app: true,
      agent: false,
    },
  };
};
