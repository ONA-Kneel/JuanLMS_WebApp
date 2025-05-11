// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true }
}, { collection: "Events" }); // Explicitly use "Events" collection

const Event = mongoose.model("Event", eventSchema);
export default Event;