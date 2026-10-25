import { fileURLToPath } from 'node:url';
import { dependency, mongoose } from './runtime.js';

let pending;
let activeConfiguration;

export async function connectDB() {
  const dotenv = dependency('dotenv');
  const envPath = process.env.DOTENV_CONFIG_PATH || fileURLToPath(new URL('../server/.env', import.meta.url));
  const result = dotenv.config({ path: envPath, quiet: true });
  if (result.error && result.error.code !== 'ENOENT') {
    throw new Error('Unable to read the configured environment file.');
  }
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is required to connect to MongoDB.');
  const timeout = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeout) || timeout < 1) {
    throw new Error('MONGODB_SERVER_SELECTION_TIMEOUT_MS must be a positive integer.');
  }
  const dbName = process.env.MONGODB_DB_NAME?.trim();
  const configuration = JSON.stringify([uri, dbName, timeout]);
  if (pending || mongoose.connection.readyState === 1) {
    if (activeConfiguration !== configuration) {
      throw new Error('MongoDB is already connected or connecting with different settings. Disconnect before changing settings.');
    }
    return pending || mongoose.connection;
  }
  if (mongoose.connection.readyState !== 0) {
    throw new Error('MongoDB connection is busy. Wait for it to disconnect before reconnecting.');
  }
  activeConfiguration = configuration;
  pending = mongoose.connect(uri, {
    ...(dbName ? { dbName } : {}),
    serverSelectionTimeoutMS: timeout,
  }).then(() => mongoose.connection).catch(() => {
    // Driver errors can contain credentials, host names or the connection URI.
    activeConfiguration = undefined;
    const error = new Error('MongoDB connection failed. Check the configured URI, database access and availability.');
    error.code = 'DB_CONNECTION_FAILED';
    throw error;
  }).finally(() => { pending = undefined; });
  return pending;
}
