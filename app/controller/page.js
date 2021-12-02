'use strict';

const Controller = require('egg').Controller;

class PageController extends Controller {
  async index() {
    const { ctx } = this;
    const { indexPage } = this.app.config;
    ctx.redirect(indexPage);
  }

  async page() {
    const { ctx } = this;
    const { query } = ctx;
    const pageName = ctx.params.pageName;
    await ctx.render(`page/${pageName}.vue`, {
      currentPath: ctx.request.path,
      query,
    });
  }


}

module.exports = PageController;
