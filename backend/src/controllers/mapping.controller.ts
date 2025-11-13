import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { UnmappedSku } from '../models/unmappedSku.model';

export const getMappings = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    try {
        const mappings = await SkuMapping.find({ gstin: gstin as string })
            .populate('mappedProducts.inventoryItem', 'title stock');
        res.json(mappings);
    } catch (error: any) {
        console.error("GET MAPPINGS ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

export const createMapping = async (req: Request, res: Response) => {
    const { gstin, sku, manufacturingPrice, packagingCost, mappedProducts } = req.body;

    if (!gstin || !sku || !mappedProducts || mappedProducts.length === 0) {
        return res.status(400).json({ message: 'GSTIN, SKU, and at least one mapped product are required' });
    }
    
    // Sanitize the incoming SKU data by trimming whitespace
    const sanitizedSku = sku.trim();

    const cleanMfgPrice = parseFloat(manufacturingPrice) || 0;
    const cleanPackagingCost = parseFloat(packagingCost) || 0;

    try {
        // Use the SANITIZED SKU for all database operations
        const existingMapping = await SkuMapping.findOne({ gstin, sku: sanitizedSku });
        if (existingMapping) {
            return res.status(409).json({ message: `A mapping for SKU "${sanitizedSku}" already exists.` });
        }

        const newMapping = await SkuMapping.create({ 
            gstin, 
            sku: sanitizedSku,
            manufacturingPrice: cleanMfgPrice,
            packagingCost: cleanPackagingCost,
            mappedProducts 
        });
        
        // Update all UnmappedSku entries with this SKU to 'mapped' status
        await UnmappedSku.updateMany(
            { gstin, sku: sanitizedSku, status: 'pending' }, 
            { $set: { status: 'mapped' } }
        );

        const populatedMapping = await SkuMapping.findById(newMapping._id)
            .populate('mappedProducts.inventoryItem', 'title stock');
        
        res.status(201).json(populatedMapping);

    } catch (error: any) {
        console.error("CREATE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

export const getUnmappedSkus = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    try {
        // Get distinct SKUs that are still pending
        const unmapped = await UnmappedSku.find({ 
            gstin: gstin as string, 
            status: 'pending' 
        }).distinct('sku');
        
        res.json(unmapped);
    } catch (error: any) {
        console.error("GET UNMAPPED SKU ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}