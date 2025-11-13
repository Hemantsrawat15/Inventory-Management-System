import { Request, Response } from 'express';
import { OrderData } from '../models/orderData.model';
import { InventoryItem } from '../models/inventoryItem.model';
import { SkuMapping } from '../models/skuMapping.model';
import { UnmappedSku } from '../models/unmappedSku.model';
import mongoose from 'mongoose';

interface ParsedOrderItem {
  orderId: string;
  sku: string;
  quantity: number;
  deliveryPartner?: string;
}

export const processOrders = async (req: Request, res: Response) => {
  const { gstin, orders } = req.body;

  if (!gstin || !orders || !Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ 
      message: 'GSTIN and orders array are required',
      success: false 
    });
  }

  console.log(`📦 Processing ${orders.length} orders for GSTIN: ${gstin}`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const results = {
      saved: 0,
      skipped: 0,
      inventoryUpdated: 0,
      unmappedSkus: [] as string[],
      errors: [] as string[]
    };

    // ✅ Track inventory updates in memory to avoid race condition
    const inventoryUpdates = new Map<string, number>();

    for (const order of orders as ParsedOrderItem[]) {
      const { orderId, sku, quantity, deliveryPartner } = order;

      // Sanitize SKU
      const sanitizedSku = sku?.trim();
      if (!sanitizedSku || !orderId) {
        results.errors.push(`Missing SKU or Order ID in order data`);
        continue;
      }

      // Check if order already exists
      const existingOrder = await OrderData.findOne({ 
        gstin, 
        orderId, 
        sku: sanitizedSku 
      });

      if (existingOrder) {
        console.log(`⚠️  Order ${orderId} with SKU ${sanitizedSku} already exists, skipping...`);
        results.skipped++;
        continue;
      }

      // Save order data
      await OrderData.create([{
        gstin,
        orderId,
        sku: sanitizedSku,
        quantity: quantity || 1,
        deliveryPartner: deliveryPartner || 'Unknown'
      }], { session });
      results.saved++;

      // Check if SKU is mapped
      const mapping = await SkuMapping.findOne({ gstin, sku: sanitizedSku });

      if (mapping && mapping.mappedProducts && mapping.mappedProducts.length > 0) {
        // Update inventory for each mapped product
        for (const mappedProduct of mapping.mappedProducts) {
          const inventoryItemId = mappedProduct.inventoryItem.toString();
          const requiredQty = mappedProduct.quantity * (quantity || 1);

          // Get current stock (either from our tracking map or from DB)
          let currentStock: number;
          
          if (inventoryUpdates.has(inventoryItemId)) {
            // Use the in-memory tracked value
            currentStock = inventoryUpdates.get(inventoryItemId)!;
          } else {
            // First time - fetch from DB
            const inventoryItem = await InventoryItem.findById(inventoryItemId);
            if (!inventoryItem) {
              console.log(`⚠️  Inventory item not found: ${inventoryItemId}`);
              continue;
            }
            currentStock = inventoryItem.stock || 0;
          }

          // Calculate new stock
          const newStock = Math.max(0, currentStock - requiredQty);
          
          // Update in-memory tracker
          inventoryUpdates.set(inventoryItemId, newStock);
          
          console.log(`✅ Tracking update: ${inventoryItemId.substring(0, 8)}... | ${currentStock} → ${newStock} (deducted ${requiredQty})`);
          results.inventoryUpdated++;
        }
      } else {
        // SKU not mapped - add to unmapped collection WITH orderId
        const existingUnmapped = await UnmappedSku.findOne({ 
          gstin, 
          sku: sanitizedSku,
          orderId,
          status: 'pending' 
        });

        if (!existingUnmapped) {
          await UnmappedSku.create([{
            gstin,
            sku: sanitizedSku,
            orderId,
            status: 'pending'
          }], { session });
          
          // Only add to results once per unique SKU
          if (!results.unmappedSkus.includes(sanitizedSku)) {
            results.unmappedSkus.push(sanitizedSku);
          }
          console.log(`⚠️  Unmapped SKU detected: ${sanitizedSku} (Order: ${orderId})`);
        }
      }
    }

    // ✅ NOW write all inventory updates to database at once
    if (inventoryUpdates.size > 0) {
      console.log(`\n💾 Writing ${inventoryUpdates.size} inventory item updates to database...`);
      
      for (const [inventoryItemId, newStock] of inventoryUpdates.entries()) {
        const item = await InventoryItem.findById(inventoryItemId);
        const oldStock = item?.stock || 0;
        
        await InventoryItem.findByIdAndUpdate(
          inventoryItemId,
          { $set: { stock: newStock } },
          { session }
        );
        
        console.log(`  ✅ ${item?.title}: ${oldStock} → ${newStock}`);
      }
    }

    await session.commitTransaction();
    console.log(`✅ Transaction committed successfully\n`);

    res.status(200).json({
      success: true,
      message: 'Orders processed successfully',
      results
    });

  } catch (error: any) {
    await session.abortTransaction();
    console.error('❌ ORDER PROCESSING ERROR:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to process orders', 
      error: error.message,
      details: error.toString()
    });
  } finally {
    session.endSession();
  }
};

export const getOrders = async (req: Request, res: Response) => {
  const { gstin } = req.query;
  
  if (!gstin) {
    return res.status(400).json({ message: 'GSTIN is required' });
  }

  try {
    const orders = await OrderData.find({ gstin: gstin as string })
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error: any) {
    console.error('GET ORDERS ERROR:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};