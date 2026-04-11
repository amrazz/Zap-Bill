import { Schema, Document, models, model } from 'mongoose';

export interface IPaymentInstallment {
  amount: number;
  paidAt: Date;
  notes?: string;
}

export interface ISalary extends Document {
  staffName: string;
  month: string;  // e.g. "April"
  year: number;   // e.g. 2026
  totalAmount?: number;       // Full salary expected (optional)
  payments: IPaymentInstallment[]; // Payment installments
  status: 'partial' | 'paid';
  // Legacy fields kept for backward compatibility
  amount?: number;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
}

const PaymentInstallmentSchema = new Schema<IPaymentInstallment>(
  {
    amount: { type: Number, required: true },
    paidAt: { type: Date, required: true, default: Date.now },
    notes: { type: String },
  },
  { _id: false }
);

const SalarySchema = new Schema<ISalary>(
  {
    staffName: { type: String, required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    totalAmount: { type: Number },
    payments: { type: [PaymentInstallmentSchema], default: [] },
    status: { type: String, enum: ['partial', 'paid'], default: 'paid' },
    // Legacy fields — kept so old records still render
    amount: { type: Number },
    paidAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

const Salary = models.Salary ?? model<ISalary>('Salary', SalarySchema);
export default Salary;
