"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

// @desc  Logs request to console
var logger = (req, res, next) => {
  console.log("".concat(req.method, " ").concat(req.protocol, "://").concat(req.get('host')).concat(req.originalUrl));
  next();
};

var _default = logger;
exports.default = _default;