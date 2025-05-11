const io = require('socket.io')(8080, {
    cors: {
        origin: "http://localhost:5000"
    }
})

let activeUsers = [];

io.on("connection", (socket) => {
    socket.on("addUser", (userId) => {
        if (!activeUsers.some(user => user.userId === userId)) {
            activeUsers.push({ 
                userId, 
                socketId: socket.id 
            });
        }
        console.log("Active Users: ", activeUsers);
        io.emit("getUsers", activeUsers);
    });

    socket.on("sendMessage", ({ senderId, receiverId, text }) => {
        const receiver = activeUsers.find(user => user.userId === receiverId);
        if (receiver) {
            io.to(receiver.socketId).emit("getMessage", {
                senderId,
                text
            });
        }
    });

    socket.on("disconnect", () => {
        activeUsers = activeUsers.filter(user => user.socketId !== socket.id);
        io.emit("getUsers", activeUsers);
    });
})