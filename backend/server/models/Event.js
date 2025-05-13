// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  color: { type: String, default: "#1890ff" } // <-- Add this line
}, { collection: "Events" }); // Explicitly use "Events" collection

const Event = mongoose.model("Event", eventSchema);
export default Event;