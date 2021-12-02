const fpPromise = FingerprintJS.load()
const baseURL = '/';
const appId = window.appId;
let refreshCount = 0;


class BizError extends Error {
  constructor({ errorCode, errorReason, response }) {
    super(errorCode);
    this.name = 'BizError';
    this.errorCode = errorCode;
    this.errorReason = errorReason;
    this.response = response;
  }
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function uuid() {
  return 'xxxxxxxx-xxxx-xxxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    // eslint-disable-next-line no-bitwise
    const r = Math.random() * 16 | 0,
        // eslint-disable-next-line no-bitwise
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomEncryptionKey() {
  const obj = {
    // timestamp: new Date().getTime() + '',
    // deviceId: uuid(),
    key: uuid(),
  };
  let jsonString = JSON.stringify(obj);
  const remainder = jsonString.length % 4;
  for (let i = 0; i < 4 - remainder; i++) {
    jsonString += ' ';
  }
  return jsonString;
}

async function getDeviceId() {
  return new Promise(async(resolve, reject) => {
    fpPromise
        .then(fp => fp.get())
        .then(result => {
          const deviceId = result.visitorId
          return resolve(deviceId)
        })
  });
}


const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  baseURL,
  withCredentials: false,
});

// 响应拦截器即异常处理
axiosInstance.interceptors.response.use(async response => {
  const ddd = response.data || {};
  const responseData = ddd.data || {};
  const { errorCode, errorReason } = responseData;
  if (errorCode === 'token_invalid' || errorCode === 'user_not_exist' || errorCode === 'token_expired') {
    localStorage.removeItem(`${window.appId}_authToken`);
    localStorage.removeItem(`${window.appId}_refreshToken`);
    location.href = `/${window.appId}/login`;
    return response;
  }
  return response;
}, err => {
  const { code, message, response } = err;
  let { errorCode, errorReason } = err;
  if (!errorCode && code) { errorCode = code; }
  if (!errorReason && message) { errorReason = message; }
  return Promise.reject(new BizError({ errorCode, errorReason, response }));
});


/**
 *
 * @param {*} protocolName  : 请求目标protocol
 * @param {*} params        : protocol 需要的入参数
 * @param {*} whereCondition: protocol sql 场景下的 where 条件;
 *    - `.where(function() {this.where( \"content\", \"like\", \"%${this.searchContent}%\")})`
 *    - `.where(function() {this.where( \"content\", \"=\", \"${this.searchContent}\")})`
 *    - `.where(function() {this.where( { content: \"${this.searchContent}\" } )})`
 * @param {*} groupId       : 数据所在groupId; 不传则使用default group
 * @param {*} isNoticeError : 是否弹出 错误信息;
 * @return : Object
 */
function protocolPost({ appId, pageId, actionId, groupId = null, params = {}, whereCondition = null, isNoticeError = true} ) {
  return new Promise(async(resolve, reject) => {
    const authToken = localStorage.getItem(`${window.appId}_authToken`);
    const appInfo = window.appInfo || {};
    const { userAgent } = appInfo;
    const packageId = `${Date.now()}_${getRandomInt(1000000, 9999999)}`;
    const deviceId = await getDeviceId();
    axiosInstance({
      method: 'post',
      url: `/${window.appId}/interface`,
      data: {
        packageId, packageType: 'request',
        data: {
          appId, pageId, actionId, deviceId,
          userAgent,
          authToken,
          params,
          whereCondition,
          groupId
        },
      },
    })
        .then(response => {
          if (response.data && response.data.status === 'fail') {
            const { errorCode, errorReason } = response.data.data;
            throw new BizError({ errorCode, errorReason, response });
          }

          const data = response.data;

          if (data.status === 'fail') {
            const { errorCode, errorReason } = data.data;
            throw new BizError({ errorCode, errorReason, response });
          }

          if (data.status === 'success') {
            return resolve(data.data);
          }

          const errorMessage = '服务器无响应';
          throw new BizError({ errorCode: response.status, errorReason: errorMessage, response });
        })
        .catch(err => {
          let { errorCode, errorReason, response } = err;
          if (!errorCode) {
            errorCode = "unknow_error";
            errorReason = "未知异常";
          }
          if (isNoticeError) { vtoast.fail(errorReason); }
          // TODO: 同步error 到 elk or sentry
          console.error('[Reauest error]', {
            appId, pageId, actionId,
            errorCode,
            errorReason,
            response,
          });
          reject(err);
        });
  });
}

const protocol = {

  // ================================pageId: login================================
  login_passwordLogin: params => protocolPost({ appId, pageId: 'login', actionId: 'passwordLogin', groupId: null, params}),
  login_logout: params => protocolPost({ appId, pageId: 'login', actionId: 'logout', groupId: null, params}),
  login_refreshToken: params => protocolPost({ appId, pageId: 'login', actionId: 'refreshToken', groupId: null, params}),
  select_allowPageAndUiLevel: params => protocolPost({ appId, pageId: 'login', actionId: 'allowPageAndUiLevel', groupId: null, params}),
  // ================================pageId: layout================================
  layout_syncDataToDataRepository: params => protocolPost({ appId, pageId: 'layout', actionId: 'syncDataToDataRepository', groupId: null, params}),
  // ================================pageId: pullDownList================================
  pullDownList_selectPullDownList: (params, whereCondition) => protocolPost({appId, pageId: 'pullDownList', actionId: 'selectPullDownList', params, whereCondition}),
  // ================================pageId: user================================
  user_userInfo: params => protocolPost({ appId, pageId: 'user', actionId: 'userInfo', groupId: null, params, isNoticeError: false}),
  // ================================pageId: file================================
  file_uploadByBase64: params => protocolPost({ appId, pageId: 'file', actionId: 'uploadByBase64', groupId: null, params}),
  file_downlaodBase64ByFileId: params => protocolPost({ appId, pageId: 'file', actionId: 'downlaodBase64ByFileId', groupId: null, params}),
  file_downlaodFrontendStatic: params => protocolPost({ appId, pageId: 'file', actionId: 'downlaodFrontendStatic', groupId: null, params}),
  // ================================pageId: studentList================================
  test_selectItemList: (params, whereCondition) => protocolPost({appId, pageId: 'test', actionId: 'selectItemList', params, whereCondition}),
  test_insertItem: (params) => protocolPost({appId, pageId: 'test', actionId: 'insertItem', params}),
  test_updateItem: (params, whereCondition) => protocolPost({appId, pageId: 'test', actionId: 'updateItem', params, whereCondition}),
  test_deleteItem: (params, whereCondition) => protocolPost({appId, pageId: 'test', actionId: 'deleteItem', params, whereCondition}),

};
