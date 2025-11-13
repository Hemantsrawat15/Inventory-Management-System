import { ShippingLabel } from '../types'; // Your custom types
import { InventoryItem } from '../models/inventoryItem.model';
import { SkuMapping } from '../models/skuMapping.model';
import { UnmappedSku } from '../models/unmappedSku.model';
import { OrderData } from '../models/orderData.model';
import mongoose from 'mongoose';

// A function to extract GSTIN using Regex
function extractGstin(pdfText: string): string | null {
  // Regex for Indian GSTIN format: 2 numbers, 5 letters, 4 numbers, 1 letter, 1 number, Z, 1 checksum
  const gstinRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}\d{1}Z\d{1}\b/g;
  const matches = pdfText.match(gstinRegex);
  // Return the first valid GSTIN found. You might need more robust logic if multiple exist.
  return matches ? matches[0] : null;
}

export async function processExtractedLabels(labels: ShippingLabel[], pdfText: string) {
  const gstin = extractGstin(pdfText);

  if (!gstin) {
    throw new Error('Could not find a valid GSTIN in the provided PDF.');
  }

  // Use a transaction to ensure all-or-nothing database updates
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const label of labels) {
      if (!label.sku || !label.orderId) continue;

      // 1. Log the order data for the dashboard
      await OrderData.findOneAndUpdate(
        { gstin, orderId: label.orderId, sku: label.sku },
        { ...label, gstin },
        { upsert: true, new: true, session }
      );

      // 2. Check for an existing mapping
      const mapping = await SkuMapping.findOne({ gstin, sku: label.sku }).session(session);

      if (mapping) {
        // 3a. MAPPING FOUND: Deduct inventory
        console.log(`✅ Mapping found for SKU: ${label.sku}. Deducting inventory.`);
        for (const product of mapping.mappedProducts) {
          await InventoryItem.findByIdAndUpdate(
            product.inventoryItem,
            { $inc: { stock: -(product.quantity * label.quantity) } },
            { session }
          );
        }
      } else {
        // 3b. NO MAPPING: Add to "Must Mapped SKUs"
        console.log(`⚠️ No mapping for SKU: ${label.sku}. Adding to unmapped list.`);
        await UnmappedSku.findOneAndUpdate(
          { gstin, sku: label.sku, orderId: label.orderId },
          { gstin, sku: label.sku, orderId: label.orderId, quantity: label.quantity, status: 'pending' },
          { upsert: true, new: true, session }
        );
      }
    }

    await session.commitTransaction();
    console.log("✅ PDF processing complete and database updated.");
    
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Transaction aborted due to an error:", error);
    throw error; // Re-throw the error to be caught by the controller
  } finally {
    session.endSession();
  }
}