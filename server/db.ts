import { MongoClient, ServerApiVersion } from 'mongodb';
import { Recipe, User } from '@shared/schema';

const uri = "mongodb+srv://bhavana-user:7822bhavana@cluster0.nmkgyei.mongodb.net/recipeDB?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB
export async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");
    return client.db("recipeDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Close MongoDB connection when app stops
process.on('SIGINT', async () => {
  await client.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

export { client };