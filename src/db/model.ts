import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}

// INFO: Schemas
const itemSchema = new mongoose.Schema({
    clerkId: String,
    type: String,
    name: String,
    unitPrice: Number,
    __more: String,
});

const storageSchema = new mongoose.Schema({
    clerkId: String,
    inventory: [
        {
            _id: false, // Prevents Mongoose from auto-generating sub-IDs for every single stock row
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item',
            },
            amount: Number,
        },
    ],
    __more: String,
});

const shopSchema = new mongoose.Schema({
    clerkId: String,
    title: String,
    inventory: [
        {
            _id: false, // Prevents Mongoose from auto-generating sub-IDs for every single stock row
            itemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Item',
            },
            amount: Number,
        },
    ],
    __more: String,
});

// INFO: Interfaces
export const Item = 
  mongoose.models.Item || 
  mongoose.model("Item", itemSchema);

export const Shop = 
  mongoose.models.Shop || 
  mongoose.model("Shop", shopSchema);

export const Storage =
  mongoose.models.Storage ||
  mongoose.model("Storage", storageSchema);
