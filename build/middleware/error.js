"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _errorResponse = _interopRequireDefault(require("../utils/errorResponse"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Utils
var errorHandler = (err, req, res, next) => {
  var error = Object.assign({}, err);
  error.message = err.message; // Log to console for dev

  console.log(err);
  var message; // Mongoose bad ObjectId

  if (err.name === 'CastError') {
    message = "Resource not found";
    error = new _errorResponse.default(message, 404);
  } // Mongoose duplicate key


  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    error = new _errorResponse.default(message, 400);
  } // Mongoose validation error


  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message);
    error = new _errorResponse.default(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};

var _default = errorHandler;
exports.default = _default;