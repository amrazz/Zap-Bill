import { Schema, Document, models, model } from 'mongoose';

export interface IVariant {
  label: string;  // e.g. "Quarter", "Half", "Full", "Per Piece"
  price: number;
}

export interface IDish extends Document {
  name: string;
  department: 'Restaurant' | 'Bakery';
  imageUrl?: string;
  isAvailable: boolean;
  category: string;
  variants: IVariant[];
  createdAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const DishSchema = new Schema<IDish>(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, enum: ['Restaurant', 'Bakery'], required: true, default: 'Restaurant' },
    imageUrl: { type: String },
    category: { type: String, trim: true, default: 'common' },
    isAvailable: { type: Boolean, default: true },
    variants: { type: [VariantSchema], required: true, validate: (v: IVariant[]) => v.length > 0 },
  },
  { timestamps: true }
);

// Clear mongoose model cache for hot-reloading in Next.js
if (models.Dish) {
  delete models.Dish;
}
const Dish = model<IDish>('Dish', DishSchema);
export default Dish;
