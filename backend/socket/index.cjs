const io = require('socket.io')(8080, {
    cors: {
        origin: "http://localhost:5173"
    }
})

let activeUsers = [];
let userGroups = {}; // Track which groups each user is in

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

    socket.on("sendMessage", ({ senderId, receiverId, text, fileUrl }) => {
        const receiver = activeUsers.find(user => user.userId === receiverId);
        if (receiver) {
            io.to(receiver.socketId).emit("getMessage", {
                senderId,
                text,
                fileUrl
            });
        }
    });

    // Join a group chat room
    socket.on("joinGroup", ({ userId, groupId }) => {
        socket.join(groupId);
        if (!userGroups[userId]) {
            userGroups[userId] = [];
        }
        if (!userGroups[userId].includes(groupId)) {
            userGroups[userId].push(groupId);
        }
        console.log(`User ${userId} joined group ${groupId}`);
    });

    // Leave a group chat room
    socket.on("leaveGroup", ({ userId, groupId }) => {
        socket.leave(groupId);
        if (userGroups[userId]) {
            userGroups[userId] = userGroups[userId].filter(id => id !== groupId);
        }
        console.log(`User ${userId} left group ${groupId}`);
    });

    // Send message to group chat
    socket.on("sendGroupMessage", ({ senderId, groupId, text, fileUrl }) => {
        // Broadcast to all users in the group (except sender)
        socket.to(groupId).emit("getGroupMessage", {
            senderId,
            groupId,
            text,
            fileUrl
        });
    });

    socket.on("disconnect", () => {
        const user = activeUsers.find(user => user.socketId === socket.id);
        if (user) {
        activeUsers = activeUsers.filter(user => user.socketId !== socket.id);
            // Clean up user groups
            delete userGroups[user.userId];
        io.emit("getUsers", activeUsers);
        }
    });
})