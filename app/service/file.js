'use strict';

const Service = require('./core/baseService');
const { base64ToBlob, getSize, mkdir, getCurrentUTC } = require('../common/protocolUtil');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const mineType = require('mime-types');
const { BizError } = require('../common/error');
const { errorEnum } = require('../common/enum');
const FILE_TABLE = '_file';
const paramsRule = Object.freeze({
  uploadByBase64: {
    fileBizType: { type: 'string', required: true },
    filename: { type: 'string', required: true },
    base64: { type: 'string', required: true },
    prefix: { type: 'string', required: true, allowEmpty: true },
  },
});
assert(paramsRule);
class FileService extends Service {

  async uploadByBase64(params) {
    this.paramValidate(paramsRule.uploadByBase64, params);
    const uploadDir = this.config.uploadDir;
    const { userId, displayName } = this.ctx.user;
    const { fileBizType, filename, base64, prefix } = params;
    if (fileBizType.startsWith('..')) { throw new BizError(errorEnum.service_filepath_error); }
    if (filename.startsWith('..')) { throw new BizError(errorEnum.service_filepath_error); }
    const base64Size = getSize(base64);
    const fileBasePath = path.join(uploadDir, fileBizType);
    const filepath = `/${fileBizType}/${prefix || ''}${filename}`;
    const target = path.join(fileBasePath, `${prefix || ''}${filename}`);
    if (filepath && filepath !== '/') { mkdir(uploadDir, fileBizType); }
    const buffer = base64ToBlob(base64);
    const binarySize = getSize(buffer);
    fs.writeFileSync(target, buffer);

    const fileId = `${prefix || ''}${filename}`;
    const updateByUserId = userId;
    const updateByUser = displayName;
    const updateAt = getCurrentUTC();
    const createByUserId = updateByUserId;
    const createByUser = updateByUser;
    const createAt = updateAt;
    const file = {
      fileId, fileBizType, filepath, filename, base64Size, binarySize,
      updateByUserId, updateByUser, updateAt,
      createByUserId, createByUser, createAt,
    };
    await this.app.knex(FILE_TABLE).insert(file);
    return file;
  }


  /**
   * @description: 通过 fileId 下载文件
   */

  async downlaodBase64ByFileId(params) {
    const uploadDir = this.config.uploadDir;
    const { fileId } = params;
    assert(fileId);
    const file = await this.app.knex(FILE_TABLE).where({ fileId }).first()
      .then(row => row);
    if (!file) { throw new BizError(errorEnum.service_file_not_found); }
    const { filepath } = file;
    const target = path.join(uploadDir, filepath);
    if (!fs.existsSync(target)) { throw new BizError(errorEnum.service_file_not_found); }
    const file_data = fs.readFileSync(target);
    const base64_data = Buffer.from(file_data).toString('base64');
    const base64 = 'data:' + mineType.lookup(filepath) + ';base64,' + base64_data;
    const base64Size = getSize(base64);
    return { base64, base64Size, filepath };
  }


  /**
   * @description: 通过 filepath & filename 下载文件
   */

  async downlaodBase64ByFilepath(params) {
    const uploadDir = this.config.uploadDir;
    const { filepath } = params;
    const filename = filepath.substring(filepath.lastIndexOf('_') + 1, filepath.length);
    if (filepath.startsWith('..')) { throw new BizError(errorEnum.service_filepath_error); }
    const target = path.join(uploadDir, filepath);
    if (!fs.existsSync(target)) { throw new BizError(errorEnum.service_file_not_found); }
    const file_data = fs.readFileSync(target);
    const base64_data = Buffer.from(file_data).toString('base64');
    const base64 = 'data:' + mineType.lookup(filename) + ';base64,' + base64_data;
    const base64Size = getSize(base64);
    return { base64, base64Size, filepath, filename };
  }

  /**
   * @description:
   *  + 这个protocol是开放的
   *  + 加密js文件然后返回给前端
   */

  async downlaodFrontendStatic(params) {
    const frontendStatic = this.config.frontendStatic;
    const { filename } = params;
    assert(filename);
    if (filename.startsWith('..')) { throw new BizError(errorEnum.service_filename_error); }
    const target = path.join(frontendStatic, filename);
    if (!fs.existsSync(target)) { throw new BizError(errorEnum.service_file_not_found); }
    const file_data = fs.readFileSync(target);
    const jsContent = Buffer.from(file_data).toString('utf-8');
    const jsContentSize = getSize(jsContent);
    return { jsContent, jsContentSize, filename };
  }


}

module.exports = FileService;

