"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _moment = _interopRequireDefault(require("moment"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var users = [];

var socketHandler = io => {
  io.on('connection', /*#__PURE__*/function () {
    var _ref = _asyncToGenerator(function* (socket) {
      console.log('New Socket Connection');
      socket.on('join', (_ref2) => {
        var {
          nickname
        } = _ref2;

        // Check is chosen nickname exists in current users list
        if (users.length && users.some(u => u.nickname === nickname)) {
          // Emit join error to current connected user
          socket.emit('joinError', 'Failed to connect. Nickname already taken.');
        } else {
          // If new user create user object and add it to users list
          var user = {
            id: socket.id,
            nickname,
            avatar: "https://placedog.net/200/200?id=".concat(Math.floor(Math.random() * 101))
          };
          users.push(user); // Emit set user to confirm connection

          socket.emit('setUser', {
            user
          });
        }
      }); // Handle idle

      var idleTimer;
      var innactive = false;
      var IDLE_DISCONNECT_TIMER = 100000;
      socket.on('newChatMessage', (_ref3) => {
        var {
          message
        } = _ref3;
        // Determine message author by current socket id
        var user = users.find(u => u.id === socket.id); // Clear idle timeout on new message

        clearTimeout(idleTimer); // Emit created message object to all users

        io.emit('newChatMessage', {
          message,
          user,
          createdAt: (0, _moment.default)().format('HH:mm:ss')
        });
        idleTimer = setTimeout(() => {
          // Set innactive to true to not cause double disconnect emit
          innactive = true; // Emit disconnection to innactivity to all users

          io.emit('userDisconnected', "".concat(user.nickname, " disconnected due to inactivity.")); // Emit innactivity disconnect to current connected user

          socket.emit('userIdle'); // Disconnect user

          socket.disconnect();
        }, IDLE_DISCONNECT_TIMER);
      });
      socket.on('disconnect', () => {
        // Clear timeout so the idle emit won't trigger after disconnect
        clearTimeout(idleTimer); // Double check if any user is connected

        if (users.length && !innactive) {
          // If connected find nickname by id
          var user = users.find(u => u.id === socket.id); // Emit disconnected to all users

          if (user) {
            io.emit('userDisconnected', "".concat(user.nickname, " left the chat, connection lost."));
          }
        } // Remove from current users list


        users = users.filter(u => u.id !== socket.id);
        console.log('Socket Connection closed');
        socket.removeAllListeners();
      });
    });

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }());
};

var _default = socketHandler;
exports.default = _default;