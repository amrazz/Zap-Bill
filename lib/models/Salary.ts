import { Schema, Document, models, model } from 'mongoose';

export interface ISalary extends Document {
  staffName: string;
  amount: number;
  month: string; // e.g. "April"
  year: number;  // e.g. 2026
  paidAt: Date;
  notes?: string;
  createdAt: Date;
}

const SalarySchema = new Schema<ISalary>(
  {
    staffName: { type: String, required: true },
    amount: { type: Number, required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    paidAt: { type: Date, required: true, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

const Salary = models.Salary ?? model<ISalary>('Salary', SalarySchema);
export default Salary;
