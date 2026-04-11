import { Schema, Document, models, model } from 'mongoose';

export interface IBillItem {
  dishName: string;
  variantLabel: string;
  price: number;
  qty: number;
}

export interface IBill extends Document {
  items: IBillItem[];
  subtotal: number;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  department: 'Restaurant' | 'Bakery';
  isDeleted: boolean;
  deletionReason?: string;
  deletedAt?: Date;
  createdAt: Date;
}

const BillItemSchema = new Schema<IBillItem>(
  {
    dishName: { type: String, required: true },
    variantLabel: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const BillSchema = new Schema<IBill>(
  {
    items: { type: [BillItemSchema], required: true },
    subtotal: { type: Number, required: true },
    orderType: { type: String, enum: ['Dine-In', 'Takeaway', 'Delivery'], required: true, default: 'Dine-In' },
    department: { type: String, enum: ['Restaurant', 'Bakery'], required: true },
    isDeleted: { type: Boolean, default: false },
    deletionReason: { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Clear mongoose model cache for hot-reloading in Next.js
if (models.Bill) {
  delete models.Bill;
}
const Bill = model<IBill>('Bill', BillSchema);
export default Bill;
