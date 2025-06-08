import express from 'express';
import cors from 'cors';
import { connectDb } from './connect.cjs';
import ticketsRouter from './routes/tickets.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/tickets', ticketsRouter);

connectDb().then(() => {
  app.listen(process.env.PORT || 5000, () => {
    console.log('Server running');
  });
}); 