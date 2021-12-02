'use strict';

module.exports.bodyStatusEnum = Object.freeze({
  success: 'success',
  fail: 'fail',
});

module.exports.errorEnum = Object.freeze({
  // =============================common error===========================================
  request_body_invalid: { errorCode: 'request_body_invalid', errorReason: '请求body不符合规范' },
  request_data_invalid: { errorCode: 'request_data_invalid', errorReason: '请求data不符合规范' },
  request_params_invalid: { errorCode: 'request_params_invalid', errorReason: '请求params不符合规范' },
  request_params_none: { errorCode: 'request_params_none', errorReason: '你输入选项为空' },
  internal_server_error: { errorCode: 'internal_server_error', errorReason: '服务器开小差了' },
  token_expired: { errorCode: 'token_expired', errorReason: 'token失效' },
  token_invalid: { errorCode: 'token_invalid', errorReason: '无效token' },
  repeated_request: { errorCode: 'repeated_request', errorReason: '重复的请求' },

  // =============================knex plus biz error===========================================
  no_update_option: { errorCode: 'no_update_option', errorReason: '没有要修改的选项' },
  data_not_unique: { errorCode: 'data_not_found', errorReason: '数据包含多条' },
  data_not_found: { errorCode: 'data_not_found', errorReason: '数据不存在' },

  // =============================biz error===========================================
  app_forbidden: { errorCode: 'app_forbidden', errorReason: '你没有这个xiaoapp的访问权限' },
  user_not_exist: { errorCode: 'user_not_exist', errorReason: '用户不存在' },
  user_password_error: { errorCode: 'user_password_error', errorReason: '用户名 或 密码错误, 请重新输入!' },
  user_banned: { errorCode: 'user_banned', errorReason: '账号被封禁! 请联系管理员。' },
  user_status_error: { errorCode: 'user_status_error', errorReason: '用户状态异常! ' },

  // =============================sql protocol error===========================================
  group_forbidden: { errorCode: 'group_forbidden', errorReason: 'group拦截, 你未加入该群!' },
  sql_action_invalid: { errorCode: 'sql_action_invalid', errorReason: '无效的action !' },

  // =============================protocol error===========================================
  protocol_forbidden: { errorCode: 'protocol_forbidden', errorReason: '无执行权限' },
  protocol_not_found: { errorCode: 'protocol_not_found', errorReason: '协议不存在' },
  protocol_not_support: { errorCode: 'protocol_not_support', errorReason: '协议不支持' },
  protocol_data_error: { errorCode: 'protocol_data_error', errorReason: '协议数据异常' },
  protocol_decrypt_error: { errorCode: 'protocol_decrypt_error', errorReason: '数据解密异常' },
  protocol_data_rule_error: { errorCode: 'protocol_data_rule_error', errorReason: '数据规则配置异常' },

  // =============================sql protocol error===========================================
  sql_forbidden: { errorCode: 'sql_forbidden', errorReason: 'sql拦截, 无执行权限!' },

  // =============================service protocol error===========================================
  service_forbidden: { errorCode: 'service_forbidden', errorReason: 'service拦截, 无执行权限!' },
  service_not_found: { errorCode: 'method_not_found', errorReason: '接口不存在' },
  service_method_not_found: { errorCode: 'method_not_found', errorReason: '接口(方法)不存在' },
  service_filepath_error: { errorCode: 'service_filepath_error', errorReason: '文件路径不合规!' },
  service_filename_error: { errorCode: 'service_filename_error', errorReason: '文件名不合规!' },
  service_file_not_found: { errorCode: 'service_file_not_found', errorReason: '文件找不到!' },

  // =============================resource error===========================================
  resource_forbidden: { errorCode: 'resource_forbidden', errorReason: 'resource拦截, 无执行权限!' },

});

module.exports.eggValidateCodeEnum = Object.freeze({
  missing_field: { zh_cn: '字段却失', en_us: ' request_body_invalid' },
  invalid: { zh_cn: '无效', en_us: ' invalid' },
});

module.exports.protocolDataRuleEnum = Object.freeze({
  userId: 'userId',
  groupId: 'groupId',
});

module.exports.protocolTypeEnum = Object.freeze({
  sql: 'sql',
  service: 'service',
  auth: 'auth',
  encrypt: 'encrypt',
  file: 'file',
});

module.exports.sqlActionEnum = Object.freeze({
  select: 'select',
  insert: 'insert',
  update: 'update',
  delete: 'delete',
});

module.exports.protocolStatusEnum = Object.freeze({
  start: 'start',
  fail: 'fail',
  success: 'success',
});

