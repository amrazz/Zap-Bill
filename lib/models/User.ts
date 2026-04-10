import mongoose, { Schema, Document, models, model } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  department: 'Restaurant' | 'Bakery' | 'Admin';
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  department: { type: String, enum: ['Restaurant', 'Bakery', 'Admin'], required: true, default: 'Restaurant' },
});

const User = models.User ?? model<IUser>('User', UserSchema);
export default User;
