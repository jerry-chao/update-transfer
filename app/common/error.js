'use strict';

class ValidationError extends Error {
  constructor({ errorCode, errorReason }) {
    super(errorCode);
    this.name = 'BizError';
    this.errorCode = errorCode;
    this.errorReason = errorReason;
  }
}

class BizError extends Error {
  constructor({ errorCode, errorReason }) {
    super(errorCode);
    this.name = 'BizError';
    this.errorCode = errorCode;
    this.errorReason = errorReason;
  }
}

class KnexPlusError extends Error {
  constructor({ errorCode, errorReason }) {
    super(errorCode);
    this.name = 'KnexPlusError';
    this.errorCode = errorCode;
    this.errorReason = errorReason;
  }
}


module.exports = {
  ValidationError,
  BizError,
  KnexPlusError,
};
