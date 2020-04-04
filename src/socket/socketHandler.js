import moment from 'moment';

let users = [];

const socketHandler = io => {
  io.on('connection', async socket => {
    console.log(`New Socket Connection.`);

    socket.on('join', ({ nickname }) => {
      // Check is chosen nickname exists in current users list
      if (
        users.length &&
        users.some(u => u.nickname === nickname) &&
        !users.some(u => u.id === socket.id)
      ) {
        // Emit join error to current connected user
        socket.emit('joinError', 'Failed to connect. Nickname already taken.');
      } else {
        // If new user create user object and add it to users list
        const user = {
          id: socket.id,
          nickname,
          avatar: `https://placedog.net/200/200?id=${Math.floor(
            Math.random() * 101
          )}`
        };

        users.push(user);

        // Emit set user to confirm connection
        socket.emit('setUser', { user });
      }
    });

    // Handle idle
    let idleTimer;
    let innactive = false;
    // Disconnect after 20 seconds
    let IDLE_DISCONNECT_TIMER = 20000;
    socket.on('newChatMessage', ({ message }) => {
      // Determine message author by current socket id
      let user = users.find(u => u.id === socket.id);

      // Clear idle timeout on new message
      clearTimeout(idleTimer);

      // Emit created message object to all users
      io.emit('newChatMessage', {
        message,
        user,
        createdAt: moment().format('HH:mm:ss')
      });
      idleTimer = setTimeout(() => {
        // Set innactive to true to not cause double disconnect emit
        innactive = true;

        // Emit disconnection to innactivity to all users
        io.emit(
          'userDisconnected',
          `${user.nickname} disconnected due to inactivity.`
        );

        // Emit innactivity disconnect to current connected user
        socket.emit('userIdle');

        // Disconnect user
        socket.disconnect();
      }, IDLE_DISCONNECT_TIMER);
    });

    // Reset innactivity timer on message type
    socket.on('startedTyping', () => {
      clearTimeout(idleTimer);
    });

    socket.on('disconnect', () => {
      // Clear timeout so the idle emit won't trigger after disconnect
      clearTimeout(idleTimer);

      // Double check if any user is connected
      if (users.length && !innactive) {
        // If connected find nickname by id
        let user = users.find(u => u.id === socket.id);

        // Emit disconnected to all users
        if (user) {
          io.emit(
            'userDisconnected',
            `${user.nickname} left the chat, connection lost.`
          );
        }
      }

      // Remove from current users list
      users = users.filter(u => u.id !== socket.id);
      console.log('Socket Connection closed');
      socket.removeAllListeners();
    });
  });
};

export default socketHandler;
