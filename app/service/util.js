'use strict';

const assert = require('assert');
const Service = require('egg').Service;
const DATA_REPOSITORY_DATABASE = 'data_repository';
const paramsRule = Object.freeze({
});
assert(paramsRule);

class UtilService extends Service {

  async syncDataToDataRepository() {
    const knex = this.app.knex;
    const sourceDatabase = this.app.config.knex.client.connection.database;
    const targetDatabase = DATA_REPOSITORY_DATABASE;
    await knex.raw(`USE ${targetDatabase};`);
    if (sourceDatabase === DATA_REPOSITORY_DATABASE) { return {}; }
    this.logger.info(`\t[${sourceDatabase}]`, '数据同步开始;');
    const sourceTables = await knex('information_schema.TABLES')
      .where({ table_schema: sourceDatabase, table_type: 'BASE TABLE' }).orderBy('table_name', 'desc')
      .select('table_name as tableName');
    const sourceBizTables = sourceTables.filter(x => !x.tableName.startsWith('_'));
    for (const j in sourceBizTables) {
      const table = sourceBizTables[j];
      const { tableName } = table;
      const targetTableName = `${sourceDatabase}__${tableName}`;
      await knex.raw(`USE ${targetDatabase};`);
      await knex.raw(`DROP TABLE IF EXISTS ${targetTableName};`);
      await knex.raw(`CREATE TABLE ${targetTableName} LIKE ${sourceDatabase}.${tableName};`);
      await knex.raw(`INSERT INTO ${targetTableName} select * from ${sourceDatabase}.${tableName};`);
      this.logger.info(`\t\t[${sourceDatabase}]`, targetTableName, '数据同步成功;');
    }
    // 最后要切换回 当前项目仓库
    await knex.raw(`USE ${sourceDatabase};`);
    return {};
  }

}

module.exports = UtilService;
