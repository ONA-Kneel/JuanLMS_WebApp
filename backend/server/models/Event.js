// models/Event.js
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  start: { type: Date, required: true }, // start datetime
  end: { type: Date }, // end datetime (optional)
  color: { type: String, default: "#1890ff" }
}, { collection: "Events" }); // Explicitly use "Events" collection

const Event = mongoose.model("Event", eventSchema);
export default Event;