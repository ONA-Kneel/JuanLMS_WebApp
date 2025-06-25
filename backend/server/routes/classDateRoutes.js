import express from 'express';
import Term from '../models/Term.js';
import SchoolYear from '../models/SchoolYear.js';
import axios from 'axios';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const activeYear = await SchoolYear.findOne({ status: 'active' });
    const activeTerm = await Term.findOne({ status: 'active' });

    if (!activeYear || !activeTerm) {
      return res.status(404).json({ message: 'Active term or school year not found.' });
    }

    const start = new Date(activeTerm.startDate);
    const end = new Date(activeTerm.endDate);

    // ✅ Fetch PH holidays for each year between start and end
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    const holidaySet = new Set();

    for (let year = startYear; year <= endYear; year++) {
      const holidayRes = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/PH`);
      holidayRes.data.forEach(h => holidaySet.add(h.date)); // Add to set
    }

    const events = [];
    let current = new Date(start);

    while (current <= end) {
      const day = current.getDay(); // 0 = Sunday, 6 = Saturday
      const dateStr = current.toISOString().split('T')[0];

      if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
        events.push({
          start: dateStr,
          display: 'background',
          backgroundColor: '#93c5fd'
        });
      }

      current.setDate(current.getDate() + 1);
    }

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating class dates.' });
  }
});

// ✅ Use default export
export default router;
