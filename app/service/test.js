'use strict';

const assert = require('assert');
const Service = require('egg').Service;
const paramsRule = Object.freeze({
});
assert(paramsRule);
class TestService extends Service {

  async test(params) {
    return {
      message: '这是一个测试的 service',
      params,
    };
  }

}

module.exports = TestService;

