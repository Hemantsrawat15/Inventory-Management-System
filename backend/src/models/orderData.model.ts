import { Schema, model, Document } from 'mongoose';

export interface IOrderData extends Document {
  gstin: string;
  orderId: string;
  sku: string;
  quantity: number;
  deliveryPartner: string;
}

const OrderDataSchema = new Schema<IOrderData>(
  {
    gstin: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    deliveryPartner: { type: String },
  },
  { timestamps: true }
);

// ✅ Define compound index properly here
OrderDataSchema.index({ gstin: 1, orderId: 1, sku: 1 }, { unique: true });

export const OrderData = model<IOrderData>('OrderData', OrderDataSchema);
