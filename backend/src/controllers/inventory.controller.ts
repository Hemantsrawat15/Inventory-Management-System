import { Request, Response } from 'express';
import { InventoryItem } from '../models/inventoryItem.model';

// The GET function remains the same.
export const getInventoryItems = async (req: Request, res: Response) => {
  const { gstin } = req.query;
  if (!gstin) return res.status(400).json({ message: 'GSTIN query parameter is required' });
  
  const items = await InventoryItem.find({ gstin: gstin as string });
  res.json(items);
};

// =================== THE DEFINITIVE FIX IS IN THIS FUNCTION ===================
export const addInventoryItem = async (req: Request, res: Response) => {
  // Add console logs to see exactly what the backend is receiving.
  // This is the most important step for debugging.
  console.log("--- ADDING NEW INVENTORY ITEM ---");
  console.log("Received Body:", req.body);
  console.log("Received File:", req.file); // Check if multer is processing the file

  const rawData = req.body;

  if (!rawData.gstin || !rawData.title) {
    return res.status(400).json({ message: 'GSTIN and Title are required' });
  }

  // --- Data Sanitization & Type Conversion ---
  // This block makes your backend robust.
  const price = Number(rawData.price);
  const stock = Number(rawData.stock);

  const cleanData = {
    gstin: rawData.gstin,
    title: rawData.title,
    category: rawData.category || undefined,
    description: rawData.description || undefined,
    // If conversion results in NaN (e.g., from an empty string), default to 0.
    price: isNaN(price) ? 0 : price,
    stock: isNaN(stock) ? 0 : stock,
    gst: rawData.gst || undefined,
    inventoryId: rawData.inventoryId || undefined,
    inventoryName: rawData.inventoryName || undefined,
    variation: rawData.variation || undefined,
    hsnCode: rawData.hsnCode || undefined,
    netWeight: rawData.netWeight || undefined,
    netQuantity: rawData.netQuantity || undefined,
    manufacturer: rawData.manufacturer || undefined,
    // In a real app, you'd get the image URL from your cloud service here
    // featuredImage: uploadedImageUrl, 
  };
  // =======================================================================

  try {
    // We now use the clean, type-safe data.
    const newItem = await InventoryItem.create(cleanData);
    res.status(201).json(newItem);
  } catch (error: any) {
    // If it still crashes, this log will show the exact database error.
    console.error("DATABASE CREATE ERROR:", error);
    res.status(500).json({ message: 'Server error while creating item in database.', error: error.message });
  }
};