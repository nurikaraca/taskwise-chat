
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // Next.js frontend URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API: Save Message
app.post('/messages', async (req, res) => {
  const { content, senderId, groupId } = req.body;

  try {
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        groupId,
      },
      include: { sender: true },
    });

  // Send the new message to all users
    io.emit('receive_message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error while saving the message:', error);
    res.status(500).json({ error: 'Message could not be saved' });
  }
});

// API: Get Group Messages
app.get('/messages/:groupId', async (req, res) => {
  const { groupId } = req.params;

  try {
    const messages = await prisma.message.findMany({
      where: { groupId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Mesajlar alınırken hata:', error);
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('// A new user has connected');

  // When a new message is received
  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
    console.log('// Message sent:', data);
  });

// Clean up listeners when the connection is lost
  socket.on('disconnect', () => {
    socket.removeAllListeners('send_message');
    socket.removeAllListeners('disconnect');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
