"use strict";

var _path = _interopRequireDefault(require("path"));

var _express = _interopRequireDefault(require("express"));

var _dotenv = _interopRequireDefault(require("dotenv"));

var _morgan = _interopRequireDefault(require("morgan"));

var _colors = _interopRequireDefault(require("colors"));

var _cookieParser = _interopRequireDefault(require("cookie-parser"));

var _helmet = _interopRequireDefault(require("helmet"));

var _xssClean = _interopRequireDefault(require("xss-clean"));

var _expressRateLimit = _interopRequireDefault(require("express-rate-limit"));

var _hpp = _interopRequireDefault(require("hpp"));

var _cors = _interopRequireDefault(require("cors"));

var _http = _interopRequireDefault(require("http"));

var _socketHandler = _interopRequireDefault(require("./socket/socketHandler"));

var _logger = _interopRequireDefault(require("./middleware/logger"));

var _error = _interopRequireDefault(require("./middleware/error"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Middlewares
// Load env vars
_dotenv.default.config({
  path: './config/config.env'
});

var app = (0, _express.default)();
app.use(_logger.default); // Body parser

app.use(_express.default.json()); // Cookie parser

app.use((0, _cookieParser.default)()); // Dev logging middleware

if (process.env.NODE_ENV === 'development') {
  app.use((0, _morgan.default)('dev'));
} // Set security headers


app.use((0, _helmet.default)()); // Prevent XSS attacks

app.use((0, _xssClean.default)()); // Rate limiting

var limiter = (0, _expressRateLimit.default)({
  windowMs: 10 * 60 * 1000,
  // 10 minutes
  max: 10000
});
app.use(limiter); // Prevent http param pollution

app.use((0, _hpp.default)()); // Enable CORS

app.use((0, _cors.default)()); // Set static folder

app.use('/public', _express.default.static(_path.default.join(__dirname, 'public')));
app.use(_error.default);
app.get('/ping', (req, res, next) => {
  res.status(200).json({
    success: true
  });
});
var PORT = process.env.PORT || 5000; // create server

app.server = _http.default.createServer(app);
app.disable('x-powered-by'); // error handling middleware

app.use(_error.default); // start server

app.server.listen(PORT, () => {
  console.log("Started server on => http://localhost:".concat(app.server.address().port, " for Process Id ").concat(process.pid));
});

var io = require('socket.io').listen(app.server, {
  pingTimeout: process.env.SOCKET_PING_TIMEOUT,
  pingInterval: process.env.SOCKET_PING_INTERVAL,
  origins: '*:*'
});

(0, _socketHandler.default)(io);
var connections = [];
app.server.on('connection', connection => {
  connections.push(connection);
  connection.on('close', () => connections = connections.filter(curr => curr !== connection));
}); // Gracefull shutdown

var shutDown = () => {
  console.info('SIGTERM signal received.');
  app.server.close(() => {
    console.log('Http server closed.');
  });
  io.close(() => {
    console.log('Socket server closed');
  });
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
  process.exit(0);
};

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);