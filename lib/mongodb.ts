import { MongoClient } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;

// 🔴 THE FIX: Connection Pooling Options (Speed Limits)
const options = {
  maxPoolSize: 50, // Maximum 50 connections banenge (Atlas Free Tier ki limit 500 hai, so this is very safe)
  minPoolSize: 10, // 10 connections hamesha "Warm" (Ready) rahenge instant ping ke liye
  serverSelectionTimeoutMS: 5000, // Agar DB busy hai, to hang hone ki jagah 5 second mein turant fail hoga
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;