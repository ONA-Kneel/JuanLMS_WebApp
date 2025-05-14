//conect.cjs
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config({path: "./config.env"})

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.ATLAS_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let database;

module.exports = {
    connectToServer: async () => {
        try {
            // Connect to MongoDB
            await client.connect();
            console.log("Successfully connected to MongoDB.");
            
            // Initialize the database
            database = client.db("JuanLMS");
            
            // Test the connection
            await database.command({ ping: 1 });
            console.log("Database connection test successful");
            
            return database;
        } catch (error) {
            console.error("Error connecting to MongoDB:", error);
            throw error;
        }
    },
    getDb: () => {
        if (!database) {
            throw new Error("Database not initialized. Call connectToServer first.");
        }
        return database;
    },
    closeConnection: async () => {
        try {
            await client.close();
            console.log("MongoDB connection closed.");
        } catch (error) {
            console.error("Error closing MongoDB connection:", error);
            throw error;
        }
    }
}

