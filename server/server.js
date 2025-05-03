import dotenv from 'dotenv';
dotenv.config({ path: './config.env' }); // ✅ Load config.env

import connect from "./connect.cjs";
import express from "express";
import cors from "cors"
import users from "./routes/userRoutes.js"
// const express = require("express")
// const cors = require("cors")

const app = express()
const PORT = 5000

app.use(cors())
app.use(express.json())
app.use(users)

app.listen(PORT, () => {
    connect.connectToServer()
    console.log(`Server is running on port: ${PORT}`)
})