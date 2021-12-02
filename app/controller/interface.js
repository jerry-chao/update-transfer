'use strict';

const assert = require('assert');
const { Controller } = require('egg');
const protocolUtil = require('../common/protocolUtil');
const errorEnum = require('../common/enum').errorEnum;
const BizError = require('../common/error').BizError;
const protocolTypeEnum = require('../common/enum').protocolTypeEnum;
// const RECORD_HISTORY_TABLE = '_record_history';
const RESOURCE_ACTIVITY_TABLE = '_resource_activity';

class InterfaceController extends Controller {
  async index() {
    const { ctx } = this;
    const { body } = ctx.request;
    const { packageId, data } = body;
    const { requestResource } = ctx;
    const knex = this.app.knex;
    const { resourceType, appId, pageId, actionId } = requestResource;

    // packageId 唯一性校验
    const resourceActivity = await knex(RESOURCE_ACTIVITY_TABLE).where({ packageId }).first()
      .then(row => row);
    if (resourceActivity) { throw new BizError(errorEnum.repeated_request); }
    assert(packageId);

    if (this.config.debug) {
      const resourceName = `${appId}.${pageId}.${actionId}`;
      this.logger.info('[InterfaceController debug]', 'packageId:', packageId, 'resource:', resourceName, 'body:', data);
    }

    switch (resourceType) {
      case protocolTypeEnum.sql:
        await this.sql(body);
        break;
      case protocolTypeEnum.service:
        await this.serviceCall(body);
        break;
      case protocolTypeEnum.auth:
        await this.serviceCall(body);
        break;
      default:
        this.fail(body, { ...errorEnum.protocol_not_support });
        break;
    }
  }
  async sql(body) {
    const data = body.data || {};
    const clientWhereCondition = data.whereCondition || '';
    let params = data.params || {};
    delete params.id;
    const ctx = this.ctx;
    const { requestResource, user } = ctx;
    const { userId } = user;
    const updateByUserId = userId;
    const updateByUser = user.displayName;
    const createByUserId = userId;
    const createByUser = user.displayName;
    const updateAt = protocolUtil.getCurrentUTC();
    const createAt = updateAt;
    const { accessControlTable } = requestResource;
    const resourceData = JSON.parse(requestResource.resourceData);
    const { table, action } = resourceData;
    const defaultWhereCondition = resourceData.whereCondition || '';
    const knex = this.app.knex;

    const getDataAccessControlWhereCondition = async function(knex, accessControlTable) {
      if (accessControlTable) {
        const accessControls = await knex(accessControlTable)
          .where({ userId })
          .select();
        return accessControls.map(x => x.whereCondition).join('');
      }
      return '';
    };

    if (action === 'insert' || action === 'update' || action === 'delete' || action === 'softUpdate' || action === 'softDelete') {
      params.updateByUserId = updateByUserId;
      params.updateByUser = updateByUser;
      params.updateAt = updateAt;
    }
    if (action === 'insert') {
      params.createByUserId = createByUserId;
      params.createByUser = createByUser;
      params.createAt = createAt;
      params.recordStatus = 'active';
    }

    /* let paramsJsonString = JSON.stringify(params);
    if (paramsJsonString.length > 2048) {
      paramsJsonString = '==params to large==';
    }*/

    if (Object.keys(params).length === 0) params = null;
    // eslint-disable-next-line no-empty-function
    const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
    const dataAccessControlWhereCondition = await getDataAccessControlWhereCondition(knex, accessControlTable);
    const whereCondition = action === 'insert' ? '' : `${defaultWhereCondition}${dataAccessControlWhereCondition}${clientWhereCondition}`;
    const rows = await knex.transaction(async trx => {

      // common crud
      if (action === 'select' || action === 'insert' || action === 'update' || action === 'delete') {
        // 执行
        const knexCommandString = `return await trx('${table}')${whereCondition}.${action}(params);`;
        // 执行protocol sql命令
        const knexCommand = new AsyncFunction('trx', 'params', knexCommandString);
        return await knexCommand(trx, params);
      }

      // soft update and soft delete
      if (action === 'softUpdate' || action === 'softDelete') {
        const rowDataCommand = `return await trx('${table}')${whereCondition}.select();`;
        const knexCommand = new AsyncFunction('trx', 'params', rowDataCommand);
        // 原始数据arr
        const rowDataArr = await knexCommand(trx, null);
        if (rowDataArr.length < 1) { return { rows: 0 }; }

        // 1. 先把原先的recordStatus 改为  deleted, 同时更改更新时间
        const upDateParams = {
          recordStatus: 'deleted',
          updateByUserId,
          updateByUser,
          updateAt,
        };
        const ids = rowDataArr.map(v => v.id);
        await trx(table).whereIn('id', ids).update(upDateParams);

        // 2. 如果是softUpdate, 把旧数据插入到一条新数据中，并且用新参数进行覆盖
        if (action === 'softUpdate') {
          const newDataArr = rowDataArr.map(row => {
            delete row.id;
            return Object.assign({}, row, params);
          });
          await trx(table).insert(newDataArr);
        }

        return { rows: ids.length };
      }

      throw new BizError(errorEnum.sql_action_invalid);
    });
    this.success(body, { rows });
  }

  async serviceCall(body) {
    const data = body.data || {};
    const ctx = this.ctx;
    const params = data.params || {};
    const { requestResource } = ctx;
    const resourceData = JSON.parse(requestResource.resourceData);
    assert(resourceData);
    const { service, serviceFunction } = resourceData;
    assert(service);
    assert(serviceFunction);


    const serviceTmp = ctx.service[service];
    if (!serviceTmp) {
      this.fail(body, { ...errorEnum.service_not_found });
      return;
    }

    const serviceFunctionTmp = serviceTmp[serviceFunction];
    if (!serviceFunctionTmp) {
      this.fail(body, { ...errorEnum.service_method_not_found });
      return;
    }
    // 注意: 这里必须 'ctx.service[serviceName][methodName]' 这样 写; 否则service无法获取egg 相关属性
    const resultData = await ctx.service[service][serviceFunction](params);
    this.success(body, resultData);
  }

  async success(body, responseData) {
    const { packageId } = body;
    const { ctx } = this;
    const responseBody = protocolUtil.success(packageId, responseData);
    ctx.body = responseBody;
  }


  async fail(body, { errorCode, errorReason }) {
    const { packageId } = body;
    const { ctx } = this;
    const responseBody = protocolUtil.fail(packageId, { errorCode, errorReason });
    ctx.body = responseBody;
  }

}

module.exports = InterfaceController;
