const io = require('socket.io')(8080, {
    cors: {
        origin: "http://localhost:5173"
    }
})

let activeUsers = [];
let userGroups = {}; // Track which groups each user is in

io.on("connection", (socket) => {
    socket.on("addUser", (userId) => {
        socket.userId = userId; // Store userId on socket for later use
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
    socket.on("sendGroupMessage", ({ senderId, groupId, text, fileUrl, senderName, senderFirstname, senderLastname, senderProfilePic }) => {
        // Broadcast to all users in the group (except sender)
        socket.to(groupId).emit("getGroupMessage", {
            senderId,
            groupId,
            text,
            fileUrl,
            senderName: senderName || "Unknown",
            senderFirstname: senderFirstname || "Unknown",
            senderLastname: senderLastname || "User",
            senderProfilePic: senderProfilePic || null
        });
    });

    // Handle group creation
    socket.on("createGroup", (groupData) => {
        // Join the group room for the creator
        socket.join(groupData._id);
        if (!userGroups[socket.userId]) {
            userGroups[socket.userId] = [];
        }
        if (!userGroups[socket.userId].includes(groupData._id)) {
            userGroups[socket.userId].push(groupData._id);
        }
        
        // Emit groupCreated event to the creator
        socket.emit("groupCreated", groupData);
        console.log(`Group created: ${groupData._id}`);
    });

    // Handle group joining
    socket.on("joinGroup", (groupData) => {
        // Join the group room
        socket.join(groupData._id);
        if (!userGroups[socket.userId]) {
            userGroups[socket.userId] = [];
        }
        if (!userGroups[socket.userId].includes(groupData._id)) {
            userGroups[socket.userId].push(groupData._id);
        }
        
        // Emit groupJoined event to the joiner
        socket.emit("groupJoined", groupData);
        console.log(`User joined group: ${groupData._id}`);
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