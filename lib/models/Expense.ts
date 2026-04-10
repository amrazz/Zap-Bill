import { Schema, Document, models, model } from 'mongoose';

export interface IExpense extends Document {
  description: string;
  amount: number;
  category: 'Rent' | 'Electricity' | 'Supplies' | 'Maintenance' | 'Miscellaneous';
  date: Date;
  department?: 'Restaurant' | 'Bakery'; // Optional: if an expense is specific to a department
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { 
      type: String, 
      enum: ['Rent', 'Electricity', 'Supplies', 'Maintenance', 'Miscellaneous'], 
      default: 'Miscellaneous',
      required: true 
    },
    date: { type: Date, required: true, default: Date.now },
    department: { type: String, enum: ['Restaurant', 'Bakery'] },
  },
  { timestamps: true }
);

const Expense = models.Expense ?? model<IExpense>('Expense', ExpenseSchema);
export default Expense;
