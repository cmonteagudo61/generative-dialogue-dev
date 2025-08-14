const mongoose = require('mongoose');

let connected = false;

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not set. Falling back to in-memory store.');
    return false;
  }
  if (connected) return true;
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed:', err?.message);
    connected = false;
    return false;
  }
}

function isDbReady() {
  return connected;
}

module.exports = { connectMongo, isDbReady, mongoose };


