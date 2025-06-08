import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
let db;

export async function connectDb() {
  await client.connect();
  db = client.db();
}

export function getDb() {
  if (!db) throw new Error('DB not connected');
  return db;
} 