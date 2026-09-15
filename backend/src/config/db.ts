// src/config/db.ts
import mongoose from "mongoose";

const connectDB = async (mongoUri: string) => {
  await mongoose.connect(mongoUri, {
    // useNewUrlParser and useUnifiedTopology are default in newer versions
  });
  console.log("MongoDB connected");
};

export default connectDB;
