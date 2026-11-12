import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  console.log("MongoDB connected");
}
