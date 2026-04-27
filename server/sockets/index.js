import jwt from 'jsonwebtoken';

export function initializeSocket(io) {
  // Socket.io authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId} (${socket.userRole})`);

    // Join session room (faculty or student)
    socket.on('session:join', (sessionId) => {
      socket.join(`session:${sessionId}`);
      console.log(`   → Joined session room: ${sessionId}`);
    });

    socket.on('session:leave', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    // Faculty extends a session
    socket.on('session:extend', ({ sessionId, extraMinutes }) => {
      io.to(`session:${sessionId}`).emit('session:extended', { sessionId, extraMinutes });
    });

    // Faculty closes a session
    socket.on('session:close', ({ sessionId }) => {
      io.to(`session:${sessionId}`).emit('session:expired', { sessionId });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`);
    });
  });
}
