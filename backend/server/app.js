import classRoutes from './routes/classRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';

app.use('/classes', classRoutes);
app.use('/announcements', announcementRoutes);
app.use('/assignments', assignmentRoutes); 