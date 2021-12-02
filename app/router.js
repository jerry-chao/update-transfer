'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, config } = app;
  const { appId } = config;
  router.get('/', controller.page.index);
  router.get(`/${appId}/`, controller.page.index);
  router.post(`/${appId}/interface`, controller.interface.index);
  router.get(`/${appId}/:pageName`, controller.page.page);

};
