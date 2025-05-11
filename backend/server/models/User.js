//models/users.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  // any other fields
});

export default mongoose.model("User", userSchema);