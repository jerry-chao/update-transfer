'use strict';

const { uuid } = require('../app/common/knexUtil');
const protocolUtil = require('../app/common/protocolUtil');
const errorEnum = require('../app/common/enum').errorEnum;
const { BizError } = require('../app/common/error');
const path = require('path');
const assert = require('assert');
const jwtUtil = require('../app/common/jwtUtil');
const geoip = require('geoip-lite');
const { pick } = require('lodash');
const USER_TABLE = '_user';
const USER_SESSION_TABLE = '_user_session';
const RESOURCE_TABLE = '_resource';
const USER_GROUP_ROLE_RESOURCE_TABLE = '_user_group_role_resource';
const USER_GROUP_ROLE_PAGE_TABLE = '_user_group_role_page';
const USER_GROUP_ROLE_UI_LEVEL_TABLE = '_user_group_role_ui_level';
const PAGE_TABLE = '_page';
const RESOURCE_ACTIVITY_TABLE = '_resource_activity';
const USER_GROUP_ROLE_TABLE = '_user_group_role';
const USER_APP_VIEW = 'view01_user_app';

module.exports = appInfo => {

  assert(appInfo);
  const appId = 'update-transfer';
  const config = {
    appTitle: 'update-transfer',
    maxAge: '14d',
    keys: 'update-transfer-1638351955374_4870',
    salt: '123456789',
    md5Salt: 'EredaAFf454',
    appId,
    debug: true,
    security: {
      csrf: { enable: false },
    },
    appDirectoryLink: 'http://127.0.0.1:7004',
    indexPage: `/${appId}/test`,
    menuList: [
      { title: '测试', path: `/${appId}/test` },
    ],
    static: {
      maxAge: 0,
      buffer: false,
      preload: false,
      maxFiles: 0,
      dir: [{ prefix: `/${appId}/public/`, dir: path.join(appInfo.baseDir, 'app/public') }, { prefix: `/${appId}/media/`, dir: path.join(appInfo.baseDir, 'app/media') }],
    },
    nunjucks: {
      cache: false,
      tags: {
        variableStart: '<$',
        variableEnd: '$>',
      },
    },
    view: {
      defaultViewEngine: 'nunjucks',
      mapping: { '.njk': 'nunjucks', '.vue': 'nunjucks' },
      root: [ path.join(appInfo.baseDir, 'app/view') ].join(','),
    },


    // =======================xiaoapp 配置===========================
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
    isGenerateJsonFile: false,
    uploadDir: path.join(appInfo.baseDir, 'app/upload'),
    coatDir: path.join(appInfo.baseDir, 'app/coat'),
    frontendStatic: path.join(appInfo.baseDir, 'app/frontendStatic'),
    middleware: [ 'capture', 'authorization' ],
    bodyParser: {
      formLimit: '100mb',
      jsonLimit: '100mb',
      textLimit: '100mb',
    },
    cors: {
      origin: '*',
      allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH',
    },
    capture: {
      match(ctx) {
        const matchUrl = `/${appId}/interface`;
        const url = ctx.request.url;
        if (url !== matchUrl) return false;
        return true;
      },
      async captureRequestResource(ctx) {
        const { appId, pageId, actionId } = ctx.request.body.data;
        if (!appId || !pageId || !actionId) { throw new BizError(errorEnum.request_body_invalid); }
        const knex = ctx.app.knex;
        assert(knex);
        const requestResource = await knex(RESOURCE_TABLE)
          .where({ appId, pageId, actionId })
          .first()
          .then(row => row);
        if (!requestResource) throw new BizError(errorEnum.protocol_not_found);
        ctx.requestResource = requestResource;
        return requestResource;
      },
      async isPublicGroupResource(ctx) {
        const requestResource = ctx.requestResource;
        const { resourceId } = requestResource;
        assert(requestResource);
        const knex = ctx.app.knex;
        const ugrrs = await knex(USER_GROUP_ROLE_RESOURCE_TABLE).where({ group: 'public' }).select();
        for (const key in ugrrs) {
          const ugrr = ugrrs[key];
          if (ugrr.resource === resourceId) {
            return true;
          }
        }
        return false;
      },
      async captureUser(ctx) {
        assert(ctx);
        const knex = ctx.app.knex;
        assert(knex);
        const { authToken } = ctx.request.body.data;
        if (!authToken) {
          return;
        }
        let jwtData = null;
        try {
          jwtData = await jwtUtil.verify(authToken);
        } catch (err) {
          return;
        }
        const { userId } = jwtData;
        const user = await knex(USER_TABLE)
          .where({ userId, userStatus: 'active' }).first()
          .then(row => row);
        if (!user || !userId) {
          return;
        }
        const userSession = await knex(USER_SESSION_TABLE)
          .where({ appId, userId, authToken }).first()
          .then(row => row);
        if (!userSession) {
          return;
        }
        const userTmp = pick(user, [ 'userId', 'username', 'displayName', 'encryptionKey' ]);
        userTmp.expireAt = jwtData.exp;
        userTmp.issuedAt = jwtData.iat;
        ctx.user = userTmp;
      },
      // async captureUserApp(ctx) {
      //   assert(ctx);
      //   const knex = ctx.app.knex;
      //   assert(knex);
      //   if (!ctx.user) {
      //     ctx.userApps = [];
      //     return;
      //   }
      //   const userApps = await knex(USER_APP_VIEW)
      //     .where('userId', '=', ctx.user.userId)
      //     .select();
      //   ctx.userApps = userApps;
      // },
      async recordResourceActivity(ctx) {
        const requestResource = ctx.requestResource;
        assert(requestResource);
        const knex = ctx.app.knex;
        assert(knex);
        const { body } = ctx.request;
        const { packageId } = body;

        const responseBodyTmp = { ...ctx.body };
        const { status: responseStatus } = responseBodyTmp;
        // 因为response data数据比较大, 所以这里剔除data
        delete responseBodyTmp.data;
        const protocolResponse = JSON.stringify(responseBodyTmp);
        // 使用...拷贝取值, 避免修改了源数据
        const requestBody = { ...ctx.request.body };
        const user = ctx.user || {};
        const { userId, displayName } = user;
        const resourceActivityId = uuid();
        const currentUTC = protocolUtil.getCurrentUTC();
        const userAgent = requestBody.data.userAgent || '';
        // Tip: 为了记录用户真实ip 需要在 nginx 把 x-real-ip 丢到 header里
        const userIp = ctx.header['x-real-ip'] || ctx.request.ip || '';
        const geo = geoip.lookup(userIp);
        let userRegion = '';
        if (geo) { userRegion = `${geo.country}|${geo.region}|${geo.timezone}|${geo.city}|${geo.ll}|${geo.range}`; }
        let protocolRequest = JSON.stringify(requestBody);
        // 如果 request数据比较大, 所以这里剔除data.params
        if (protocolRequest.length > 65535) {
          delete requestBody.data.params;
          protocolRequest = JSON.stringify(requestBody);
        }
        const { resourceId, appId, pageId, actionId } = requestResource;
        const resourceName = `${appId}.${pageId}.${actionId}`;
        await knex(RESOURCE_ACTIVITY_TABLE)
          .insert({
            packageId,
            resourceActivityId,
            resourceId,
            resourceName,
            userIp, userAgent, userRegion,
            resourceActivityStatus: responseStatus,
            protocolRequest,
            protocolResponse,
            updateByUserId: userId,
            updateByUser: displayName,
            createByUserId: userId,
            createByUser: displayName,
            updateAt: currentUTC,
            createAt: currentUTC,
          });
      },
    },
    authorization: {
      match(ctx) {
        const matchUrl = `/${appId}/interface`;
        const url = ctx.request.url;
        if (url !== matchUrl) return false;
        return true;
      },
      async isPublicGroupResource(ctx) {
        const requestResource = ctx.requestResource;
        const { resourceId } = requestResource;
        assert(requestResource);
        const knex = ctx.app.knex;
        const ugrrs = await knex(USER_GROUP_ROLE_RESOURCE_TABLE).where({ group: 'public' }).select();
        for (const key in ugrrs) {
          const ugrr = ugrrs[key];
          if (ugrr.resource === resourceId) {
            return true;
          }
        }
        return false;
      },
      async isLoginGroupResource(ctx) {
        const requestResource = ctx.requestResource;
        const { resourceId } = requestResource;
        assert(requestResource);
        const knex = ctx.app.knex;

        // resource 映射了 login group; 则login group有该resource 的访问权限。
        const ugrrs = await knex(USER_GROUP_ROLE_RESOURCE_TABLE).where({ group: 'login' }).select();
        for (const key in ugrrs) {
          const ugrr = ugrrs[key];
          if (this.getKeyCandidates(resourceId).includes(ugrr.resource)) {
            return true;
          }
        }

        // resource 没有映射任何 group; 则login group有该resource 的访问权限。
        const ugrrs2 = await knex(USER_GROUP_ROLE_RESOURCE_TABLE).whereIn('resource', this.getKeyCandidates(resourceId, false)).select();
        if (ugrrs2.length < 1) {
          return true;
        }

        return false;
      },
      async checkUserAppAccess(ctx) {
        assert(ctx);
        assert(ctx.userApps);

        const currentUserApp = ctx.userApps.find(x => x.appId === appId);
        if (!currentUserApp) {
          throw new BizError(errorEnum.app_forbidden);
        }
      },
      async captureUserGroupRoleList(ctx) {
        assert(ctx);
        const knex = ctx.app.knex;
        assert(knex);
        assert(ctx.user);
        const { userId } = ctx.user;
        ctx.userGroupRoleList = await knex(USER_GROUP_ROLE_TABLE)
          .where({ userId })
          .select();
      },
      async captureUserPageAndUiLevel(ctx) {
        assert(ctx);
        const knex = ctx.app.knex;
        assert(knex);
        const { userId } = ctx.user;
        const groupIds = ctx.userGroupRoleList.map(x => x.groupId).filter(x => x);
        const roleIds = ctx.userGroupRoleList.map(x => x.roleId).filter(x => x);

        // 计算用户能访问的 allowPageList
        const userPageRules = await knex(USER_GROUP_ROLE_PAGE_TABLE)
          .whereIn('user', [ '*', userId ])
          .whereIn('group', [ ...groupIds, '*', 'public', 'login' ])
          .whereIn('role', [ ...roleIds, '*' ])
          .select();
        const pageList = await knex(PAGE_TABLE).select();
        const allowPageList = [ 'public', 'login' ];
        if (pageList && userPageRules) {
          userPageRules.forEach(rule => {
            if (rule.allowOrDeny === 'deny') {
              return;
            }
            if (rule.page === '*') {
              allowPageList.push('*');
            } else {
              const page = pageList.find(page => page.pageId === rule.page);
              if (page) {
                allowPageList.push(page.pageId);
              }
            }
          });
        }
        ctx.allowPageList = allowPageList;

        // 计算用户能访问的 allowUiLevelList
        const userUiLevelRules = await knex(USER_GROUP_ROLE_UI_LEVEL_TABLE)
          .whereIn('user', [ '*', userId ])
          .whereIn('group', [ ...groupIds, '*' ])
          .whereIn('role', [ ...roleIds, '*' ])
          .select();
        const allowUiLevelList = [];
        if (userUiLevelRules) {
          userUiLevelRules.forEach(rule => {
            if (rule.allowOrDeny === 'allow') {
              allowUiLevelList.push(rule.uiLevel);
            }
          });
        }
        ctx.allowUiLevelList = allowUiLevelList;
      },
      async checkRequestAccessByUserGroupRole(ctx) {
        assert(ctx);
        const knex = ctx.app.knex;
        assert(knex);
        const { requestResource, userGroupRoleList, user } = ctx;
        assert(user);

        // 1. 检查 resource 权限
        const { resourceId } = requestResource;
        const resourceCandidates = this.getKeyCandidates(resourceId);
        const ruleListByResource = await knex(USER_GROUP_ROLE_RESOURCE_TABLE)
          .whereIn('resource', resourceCandidates).select();
        await this.checkRequestAccessCommon(userGroupRoleList, ruleListByResource);

        // // 2. todo 检查 page 权限
        // if (requestPage) {
        //   const { pageId } = requestPage;
        //   const pageCandidates = this.getKeyCandidates(pageId);
        //   const ruleListByPage = await knex(USER_GROUP_ROLE_PAGE_TABLE)
        //     .whereIn('page', pageCandidates).select();
        //   await this.checkRequestAccessCommon(userGroupRoleList, ruleListByPage);
        // }

      },
      getKeyCandidates(resourceId, needRoot = true) {
        // a.b.c -> [a.b.c, a.b.*, a.*, *]
        // 将 resource 按 . 切分，并组装成带 * 的候选词
        const resourceCandidate = [ resourceId ];
        const parts = resourceId.split('.');
        const partsLength = parts.length;
        for (let i = 0; i < partsLength; i++) {
          parts.pop();
          if (!needRoot && !parts.length) {
            // 不需要 * 权限
            continue;
          }
          resourceCandidate.push([ ...parts, '*' ].join('.'));
        }
        return resourceCandidate;
      },
      async checkRequestAccessCommon(userGroupRoleList, ruleList) {
        const allowRules = [];
        // 针对每条 user_group_role_xxx
        for (const key in ruleList) {
          const userGroupRoleItem = ruleList[key];
          const { user, group, role, allowOrDeny } = userGroupRoleItem;
          // 遍历 user_group_role 并判断
          for (const key2 in userGroupRoleList) {
            const userGroupRole = userGroupRoleList[key2];
            // 判断是否匹配
            const matchUser = user === '*' || user === userGroupRole.userId;
            const matchGroup = group === '*' || group === userGroupRole.groupId;
            const matchRole = role === '*' || role === userGroupRole.roleId;
            if (matchUser && matchGroup && matchRole) {
              if (allowOrDeny === 'allow') {
                allowRules.push(userGroupRoleItem);
              } else if (allowOrDeny === 'deny') {
                throw new BizError(errorEnum.resource_forbidden);
              }
            }
          }
        }
        if (allowRules.length === 0) {
          throw new BizError(errorEnum.resource_forbidden);
        }
        return allowRules;
      },
    },
    logger: {
      outputJSON: true,
      dir: path.join(appInfo.baseDir, 'logs'),
      contextFormatter(meta) {
        return `[${meta.date}] [${meta.level}] [${meta.ctx.method} ${meta.ctx.url}] ${meta.message}`;
      },
    },
    onerror: {
      // all() {
      //   console.log('>>>>>>');
      // },
      // html(err, ctx) {
      //   const { errorCode, errorReason } = err;
      //   ctx.body = `<h3>错误码:${errorCode}</h3><h3>错误信息:${errorReason}</h3>`;
      //   ctx.status = 400;
      // },
      async json(err, ctx) {
        ctx.status = 200;
        const { packageId } = ctx.request.body;
        ctx.logger.error('[config.default.onerror]', { packageId }, err);
        const errorCode = err.errorCode || errorEnum.internal_server_error.errorCode;
        const errorReason = err.errorReason || errorEnum.internal_server_error.errorReason;
        ctx.body = protocolUtil.fail(packageId, { errorCode, errorReason });

        // 记录 request resource; 这里的异常不能影响主业务 所以 try catch
        try {
          await ctx.app.config.capture.recordResourceActivity(ctx);
        } catch (err) {
          ctx.logger.error('[recordResourceActivity error]', err);
        }
      },
    },
    validate: {},

  };

  const userConfig = {};

  return {
    ...config,
    ...userConfig,
  };
};
