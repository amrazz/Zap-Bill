import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  department: 'Restaurant' | 'Bakery';
  createdAt: Date;
}

const CategorySchema: Schema = new Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true,
  },
  department: { 
    type: String, 
    enum: ['Restaurant', 'Bakery'], 
    required: true 
  },
}, { 
  timestamps: true 
});

// Ensure unique category names per department
CategorySchema.index({ name: 1, department: 1 }, { unique: true });

const Category: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;
