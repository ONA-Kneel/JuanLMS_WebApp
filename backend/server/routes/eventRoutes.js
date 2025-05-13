// routes/eventRoutes.js
import express from "express";
import Event from "../models/Event.js";

const router = express.Router();

// GET all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find({});
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST new event (optional, for adding events)
router.post("/", async (req, res) => {
    console.log("POST /events body:", req.body); // <--- Add this
    const { title, date } = req.body;
  if (!title || !date) {
    return res.status(400).json({ message: "Title and date are required" });
  }
  try {
    const newEvent = new Event({ title, date: new Date(date) });
    await newEvent.save();
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT update event
router.put("/:id", async (req, res) => {
  const { title, date, color } = req.body;
  try {
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { title, date: new Date(date), color },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE event
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Event.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;