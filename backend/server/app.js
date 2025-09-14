import classRoutes from './routes/classRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import registrantRoutes from './routes/registrantRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import pushSubscriptionRoutes from './routes/pushSubscriptionRoutes.js';

app.use('/classes', classRoutes);
app.use('/announcements', announcementRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/api/registrants', registrantRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes); 