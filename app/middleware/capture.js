'use strict';

const assert = require('assert');

module.exports = option => {
  return async (ctx, next) => {

    // 1 捕获 request resource
    await option.captureRequestResource(ctx);
    assert(ctx.requestResource);

    // 2. 捕获 user 到 ctx.user
    await option.captureUser(ctx);

    // 3. 捕获 userApps 到 ctx.userApps
    // await option.captureUserApp(ctx);

    // 4. 传给下一个中间件/执行业务方法
    await next();

    // 5. 记录 request resource; 这里的异常不能影响主业务 所以 try catch
    try {
      await option.recordResourceActivity(ctx);
    } catch (err) {
      ctx.logger.error('[recordResourceActivity error]', err);
    }
  };
};

