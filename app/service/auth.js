'use strict';


const Service = require('./core/baseService');
const md5 = require('md5-node');
const geoip = require('geoip-lite');
const { BizError } = require('../common/error');
const errorEnum = require('../common/enum').errorEnum;
const jwtUtil = require('../common/jwtUtil');
const protocolUtil = require('../common/protocolUtil');
const USER_TABLE = '_user';
const USER_SESSION_TABLE = '_user_session';
const USER_LOGIN_HISTORY_TABLE = '_user_login_history';
const paramsRule = Object.freeze({
  passwordLogin: {
    username: { type: 'string', required: true, allowEmpty: false, min: 3, max: 30 },
    password: { type: 'string', required: true, allowEmpty: false, min: 6, max: 30 },
  },
  refreshToken: {
    refreshToken: 'string',
  },
});


class AuthService extends Service {

  async allowPageAndUiLevel() {
    // 返回有权限的 page、uiLevel
  }

  async passwordLogin(params) {

    this.paramValidate(paramsRule.passwordLogin, params);
    const { deviceId } = this.ctx.request.body.data;
    const { username, password } = params;
    const appId = this.app.config.appId;
    const user = await this.app.knex(USER_TABLE)
      .where({
        username,
        recordStatus: 'active',
      })
      .first()
      .then(row => row);
    const { userStatus } = user;
    if (userStatus !== 'active') {
      if (userStatus === 'banned') { throw new BizError(errorEnum.user_banned); }
      throw new BizError(errorEnum.user_status_error);
    }
    // user password check
    if (!user || !user.userId) {
      throw new BizError({ ...errorEnum.user_password_error });
    }
    const md5Salt = this.config.md5Salt;
    const passwordMd5 = md5(`${password}_${md5Salt}`);
    if (passwordMd5 !== user.password) {
      throw new BizError({ ...errorEnum.user_password_error });
    }
    const { userId, displayName } = user;

    // token sign
    const authToken = jwtUtil.signAuthToken({ username: user.username, userId: user.userId });
    const refreshToken = jwtUtil.signRefreshToken({ username: user.username, userId: user.userId });
    // 存token 的目的是为了
    //   1. 系统可以根据这个判断是否是自己生成的token
    //   2. 有时候系统升级需要 用户重新登陆/重新登陆，这时候可以通过清理旧token达到目的
    const updateAt = protocolUtil.getCurrentUTC();
    const userSession = await this.app.knex(USER_SESSION_TABLE)
      .where({ appId, userId, authToken })
      .first()
      .then(row => row);
    if (userSession && userSession.id) {
      await this.app.knex(USER_SESSION_TABLE)
        .where({ id: userSession.id })
        .update({ authToken, refreshToken, updateAt });
    } else {
      const updateByUserId = userId;
      const updateByUser = user.displayName;
      const createByUserId = userId;
      const createByUser = user.displayName;
      const createAt = updateAt;
      const userAgent = this.ctx.request.body.data.userAgent || '';
      await this.app.knex(USER_SESSION_TABLE)
        .insert({
          appId, userId, deviceId, userAgent,
          authToken, refreshToken,
          updateByUserId, updateByUser, updateAt,
          createByUserId, createByUser, createAt,
        });
    }

    this.recordLoginHistory({ action: 'login', userId, username, displayName });

    return { authToken, refreshToken, deviceId };
  }

  async logout() {
    const knex = this.app.knex;
    const ctx = this.ctx;
    const appId = this.app.config.appId;
    const { authToken } = ctx.request.body.data;
    const jwtData = await jwtUtil.verify(authToken);
    const { userId } = jwtData;
    const user = await knex(USER_TABLE)
      .where({ userId, userStatus: 'active' }).first()
      .then(row => row);
    if (!user || !userId) {
      throw new BizError({ ...errorEnum.user_not_exist });
    }
    const { username, displayName } = user;
    const userSession = await this.app.knex(USER_SESSION_TABLE)
      .where({ appId, userId, authToken }).first()
      .then(row => row);
    if (!userSession) {
      throw new BizError({ ...errorEnum.token_invalid });
    }


    await this.app.knex(USER_SESSION_TABLE)
      .where({ id: userSession.id })
      .update({ authToken: '', refreshToken: '' });

    this.recordLoginHistory({ action: 'logout', userId, username, displayName });

    return {};
  }

  async refreshToken(params) {

    this.paramValidate(paramsRule.refreshToken, params);
    const appId = this.app.config.appId;
    const { authToken } = this.ctx.request.body.data;
    const refreshToken = params.refreshToken;
    const refreshJwtData = await jwtUtil.verify(refreshToken);
    const userId = refreshJwtData.userId;
    try {
      await jwtUtil.verify(authToken);
    } catch (err) {
      // 为了安全 这里验证一下authToken是否真的expired
      if (err.name !== 'TokenExpiredError') throw new BizError(errorEnum.token_invalid);
    }

    const user = await this.app.knex(USER_TABLE)
      .where({ userId, userStatus: 'active' }).first()
      .then(row => row);
    if (!user || !user.userId) {
      throw new BizError({ ...errorEnum.user_not_exist });
    }

    const { username, displayName } = user;

    const userSession = await this.app.knex(USER_SESSION_TABLE)
      .where({ appId, userId, refreshToken }).first()
      .then(row => row);
    if (!userSession) {
      throw new BizError({ ...errorEnum.token_invalid });
    }


    // 签发新的authToken
    const updateAt = protocolUtil.getCurrentUTC();
    const newAuthToken = jwtUtil.signAuthToken({ username: user.username, userId: user.userId });
    await this.app.knex(USER_SESSION_TABLE)
      .where({ id: userSession.id })
      .update({ authToken: newAuthToken, updateAt });

    this.recordLoginHistory({ action: 'refreshToken', userId, username, displayName });

    return { authToken: newAuthToken };
  }

  async recordLoginHistory({ action, userId, username, displayName }) {
    const ctx = this.ctx;
    const currentUTC = protocolUtil.getCurrentUTC();
    const userAgent = ctx.request.body.data.userAgent || '';
    // Tip: 为了记录用户真实ip 需要在 nginx 把 x-real-ip 丢到 header里
    const userIp = ctx.header['x-real-ip'] || ctx.request.ip || '';
    const geo = geoip.lookup(userIp);
    let userRegion = '';
    if (geo) { userRegion = `${geo.country}|${geo.region}|${geo.timezone}|${geo.city}|${geo.ll}|${geo.range}`; }
    await this.app.knex(USER_LOGIN_HISTORY_TABLE).insert({
      userId, username,
      userIp, userAgent, userRegion,
      action,
      updateByUserId: userId,
      updateByUser: displayName,
      createByUserId: userId,
      createByUser: displayName,
      updateAt: currentUTC,
      createAt: currentUTC,
    });

  }
}

module.exports = AuthService;
