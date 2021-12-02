'use strict';

const Service = require('egg').Service;
const { errorEnum } = require('../../common/enum');
const { BizError } = require('../../common/error');

class BaseService extends Service {
  get appId() {
    return this.app.config.appId;
  }

  paramValidate(rule, params) {
    const validator = this.app.validator;
    const bodyErrors = validator.validate(rule, params);
    if (bodyErrors) {
      const errorCode = errorEnum.request_body_invalid.errorCode;
      const errorReason = bodyErrors
        .map(x => {
          const { field, message } = x;
          return field + ' 字段' + message;
        })
        .join('; ');
      throw new BizError({ errorCode, errorReason });
    }
  }

}
module.exports = BaseService;
