'use strict';

const assert = require('assert');
const { BizError } = require('../common/error');
const { errorEnum } = require('../common/enum');
const md5 = require('md5-node');
const Service = require('./core/baseService');
const USER_TABLE = '_user';
const paramsRule = Object.freeze({
  passwordReset: {
    oldPassword: { type: 'string', required: true, allowEmpty: false, min: 6, max: 30 },
    newPassword: { type: 'string', required: true, allowEmpty: false, min: 6, max: 30 },
  },
});
assert(paramsRule);

class UserService extends Service {

  async userInfo() {
    const { user, userGroups, allowPageList, allowUiLevelList, userApps } = this.ctx;
    return { ...user, userGroups, userApps, allowPageList, allowUiLevelList };
  }

  // 重置密码
  async resetPassword(params) {
    this.paramValidate(paramsRule.passwordReset, params);
    const { oldPassword, newPassword } = params;
    const { userId } = this.ctx.user;
    const user = await this.app.knex(USER_TABLE)
      .where({
        userId,
      })
      .first()
      .then(row => row);

    // 旧密码检查
    const md5Salt = this.config.md5Salt;
    const passwordMd5 = md5(`${oldPassword}_${md5Salt}`);
    if (passwordMd5 !== user.password) {
      throw new BizError({ ...errorEnum.user_password_reset_old_error });
    }
    // 密码一致检查
    if (oldPassword === newPassword) {
      throw new BizError({ ...errorEnum.user_password_reset_same_error });
    }

    // 修改数据库中密码
    const newPasswordMd5 = md5(`${newPassword}_${md5Salt}`);
    await this.app.knex(USER_TABLE)
      .where({ userId: user.userId })
      .update({ password: newPasswordMd5 });
    return {};
  }

}

module.exports = UserService;
