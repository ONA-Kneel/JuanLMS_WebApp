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
    console.log("POST /events body:", req.body);
    const { title, start, end, color } = req.body;
    if (!title || !start) {
        return res.status(400).json({ message: "Title and start date are required" });
    }
    try {
        const newEvent = new Event({ title, start: new Date(start), end: end ? new Date(end) : undefined, color });
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// PUT update event
router.put("/:id", async (req, res) => {
  const { title, start, end, color } = req.body;
  try {
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { title, start: new Date(start), end: end ? new Date(end) : undefined, color },
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