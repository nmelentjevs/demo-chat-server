import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import colors from 'colors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import cors from 'cors';
import http from 'http';
import socketHandler from './socket/socketHandler';

// Middlewares
import logger from './middleware/logger';
import errorHandler from './middleware/error';

// Load env vars
dotenv.config({ path: './config/config.env' });

const app = express();
app.use(logger);

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10000
});

app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

app.get('/ping', (req, res, next) => {
  res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 5000;

// create server
app.server = http.createServer(app);

app.disable('x-powered-by');

// error handling middleware
app.use(errorHandler);

// start server
app.server.listen(PORT, () => {
  console.log(
    `Started server on => http://localhost:${
      app.server.address().port
    } for Process Id ${process.pid}`
  );
});

const io = require('socket.io').listen(app.server, {
  pingTimeout: process.env.SOCKET_PING_TIMEOUT,
  pingInterval: process.env.SOCKET_PING_INTERVAL,
  origins: '*:*'
});
socketHandler(io);

let connections = [];
app.server.on('connection', connection => {
  connections.push(connection);
  connection.on(
    'close',
    () => (connections = connections.filter(curr => curr !== connection))
  );
});

// Gracefull shutdown
const shutDown = () => {
  console.info('SIGTERM signal received.');
  app.server.close(() => {
    console.log('Http server closed.');
  });
  io.close(() => {
    console.log('Socket server closed');
  });

  setTimeout(() => {
    console.error(
      'Could not close connections in time, forcefully shutting down'
    );
    process.exit(1);
  }, 10000);

  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
  process.exit(0);
};

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);
