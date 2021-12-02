'use strict';

/**
 * [rsa 在线生成](https://www.bejson.com/enc/rsa/)
 */
const privateKey = `-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA3TWO2RStO7CYSqxr
exyMGvvFAW2IpSl4FtIQkw28stLG9v8vYlcc457UDfTHGfQ2afGHyFtYog8c6jAU
80XFnwIDAQABAkBagZVGoD0YlPJaax02q8FvMN+z69riqIrn217Iq/AuwWfFGa6M
lCHsll+FmljC6iY3TXvTBzupIXlXptaUSK2hAiEA8GdPNrcvR11SSHlB7596KnqO
smq8c+mxX1uDNOVITmcCIQDrj3anK7Zep4opgv/O5JhlZeiUZrzdf715zJ27J0Jc
CQIgDlTqWQW0sNl0ZVOtRZ7JRq0FwscwMuzUoS2wdb/RfrMCIQCf/XC5WhcjcueE
ClV0UA6xz+WH5b+hMYGfmDoJQ0DvAQIgXTQO63QMz2fuWix9YHxPuT2wWAawy9MB
wQ8S+pUPZlI=
-----END PRIVATE KEY-----`;

const publicKey = `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAN01jtkUrTuwmEqsa3scjBr7xQFtiKUp
eBbSEJMNvLLSxvb/L2JXHOOe1A30xxn0Nmnxh8hbWKIPHOowFPNFxZ8CAwEAAQ==
-----END PUBLIC KEY-----`;
const jwt = require('jsonwebtoken');
const issuer = 'fssl_local';
const { token_invalid, token_expired } = require('./enum').errorEnum;


/**
 * @description token; token 包含以下信息
 *   userId: 'bb045e06-bc40-11eb-be43-525400ddbceb',
 *   username: 'zhangsan',
 *   exp: 1623052578,   # 失效时间--> 三周后
 *   iat: 1621842978,    # 签发token的时间
 *   iss: 'fssl_local'  # 签发人
 */

module.exports.signAuthToken = function({ userId, username }) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 21;
  // const exp = Math.floor(Date.now() / 1000) + 20;
  const token = jwt.sign({ userId, username, exp }, privateKey, { algorithm: 'RS256', issuer });
  return token;
};

module.exports.signRefreshToken = function({ userId, username }) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180;
  const token = jwt.sign({ userId, username, exp }, privateKey, { algorithm: 'RS256', issuer });
  return token;
};

module.exports.verify = async function(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, { issuer }, function(err, decoded) {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            err.errorCode = token_expired.errorCode;
            err.errorReason = token_expired.errorReason;
            break;
          case 'JsonWebTokenError':
            err.errorCode = token_invalid.errorCode;
            err.errorReason = token_invalid.errorReason;
            break;
          default:
            err.errorCode = token_expired.errorCode;
            err.errorReason = token_expired.errorReason;
            break;
        }
        reject(err);
      }
      resolve(decoded);
    });
  });
};
