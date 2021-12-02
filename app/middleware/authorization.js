'use strict';

const assert = require('assert');
const { BizError } = require('../common/error');
const errorEnum = require('../common/enum').errorEnum;

module.exports = option => {
  return async (ctx, next) => {

    const { requestResource, user } = ctx;
    const isLoginUser = user && user.userId;
    assert(requestResource);

    // 1. 判断request resource 是否映射 public group
    const isPublicGroupResource = await option.isPublicGroupResource(ctx);
    if (isPublicGroupResource) {
      // 传给下一个中间件/执行业务方法
      await next();
      return;
    }

    // 2. 检查用户是否登陆
    if (!isLoginUser) {
      throw new BizError(errorEnum.token_invalid);
    }

    // 3. 判断用户是否有 当前App访问权限
    await option.checkUserAppAccess(ctx);

    // 4. 捕获用户 UserGroupRole 列表
    await option.captureUserGroupRoleList(ctx);
    assert(ctx.userGroupRoleList);

    // 5. 捕获用户 Pages, ui levels
    await option.captureUserPageAndUiLevel(ctx);

    // 6. 判断request resource 是否映射 login group; 并且用户已登陆
    const isLoginGroupResource = await option.isLoginGroupResource(ctx);
    if (isLoginGroupResource) {
      // 传给下一个中间件/执行业务方法
      await next();
      return;
    }

    // 7. 判断用户对 resource、page、ui_leve 的权限
    await option.checkRequestAccessByUserGroupRole(ctx);

    await next();
  };
};

