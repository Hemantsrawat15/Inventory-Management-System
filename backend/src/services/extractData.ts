import { ShippingLabel, ValidationResult } from '../types';

export function extractShippingLabels(pdfText: string): ShippingLabel[] {
  const labels: ShippingLabel[] = [];
  
  // Use mentor's approach: Split by "Customer Address"
  const invoiceChunks = pdfText.split(/(?=Customer Address)/g);
  
  console.log(`Found ${invoiceChunks.length} invoice chunks`);
  
  invoiceChunks.forEach((chunk, index) => {
    try {
      // Skip invalid chunks
      if (!chunk || chunk.length < 100) {
        console.log(`Skipping chunk ${index} - too short`);
        return;
      }
      
      console.log(`\n📦 Processing Label ${index + 1}`);
      
      const products = extractProducts(chunk);
      const deliveryPartner = extractDeliveryPartner(chunk);
      
      // Process each product in the chunk
      products.forEach((product) => {
        const label: ShippingLabel = {
          labelNumber: labels.length + 1,
          sku: product.sku,
          orderId: product.orderNo,
          quantity: product.quantity,
          deliveryPartner: deliveryPartner,
        };
        
        console.log(`   Result: SKU="${label.sku}", Order="${label.orderId}", Qty=${label.quantity}, Partner="${label.deliveryPartner}"`);
        
        if (label.sku && label.orderId) {
          labels.push(label);
        }
      });
      
    } catch (error) {
      console.error(`Error processing chunk ${index}:`, error);
    }
  });
  
  return labels;
}

function extractProducts(chunk: string): Array<{sku: string, orderNo: string, quantity: number, size: string, color: string}> {
  const products: Array<{sku: string, orderNo: string, quantity: number, size: string, color: string}> = [];
  
  try {
    // Find "Product Details" section (before TAX INVOICE)
    const prodBlockMatch = chunk.match(/Product Details\s*([\s\S]*?)(?=TAX INVOICE)/i);
    if (!prodBlockMatch) {
      console.log('   ⚠️ No Product Details section found');
      return products;
    }
    
    const prodText = prodBlockMatch[1].trim();
    const lines = prodText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    
    // Find header line: "SKU Size Qty Color Order No."
    const headerLineIndex = lines.findIndex((line) =>
      /sku/i.test(line) &&
      /size/i.test(line) &&
      /qty/i.test(line) &&
      /color/i.test(line) &&
      /order no/i.test(line)
    );
    
    if (headerLineIndex === -1) {
      console.log('   ⚠️ Product table header not found');
      return products;
    }
    
    // Collect lines until we hit the line with order number
    const skuLines: string[] = [];
    let rawLine = "";
    
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      if (/\d+_\d+$/.test(lines[i])) {
        rawLine = lines[i];
        break;
      }
      skuLines.push(lines[i]);
    }
    
    // Handle multi-line order number
    if (skuLines.length === 1) {
      rawLine = skuLines.join(" ").replace(/,+$/, "").trim();
    }
    
    if (!rawLine) {
      console.log('   ⚠️ No product data line found');
      return products;
    }
    
    // Normalize: insert spaces between letters and numbers
    const norm = rawLine
      .replace(/(?<!-)([A-Za-z])(\d)/g, "$1 $2")  // "RA8" -> "RA 8"
      .replace(/(\d)([A-Za-z])/g, "$1 $2")        // "1Red" -> "1 Red"
      .replace(/([a-z])([A-Z])/g, "$1 $2")        // "freeSize" -> "free Size"
      .trim();
    
    const parts = norm.split(/\s+/);
    
    // Extract from the end
    const orderNo = parts.pop() || "";
    const color = parts.pop() || "";
    const qtyStr = parts.pop() || "1";
    const size2 = parts.pop() || "";
    const size1 = parts.pop() || "";
    
    // Determine SKU
    let sku = "";
    if (skuLines.length > 1) {
      // Multi-line SKU
      sku = skuLines.join(" ");
    } else {
      // Single-line SKU - everything before "Free Size"
      const phrase = `${size1} ${size2}`.toLowerCase();
      const idx = rawLine.toLowerCase().indexOf(phrase);
      if (idx > 0) {
        sku = rawLine.substring(0, idx).trim();
      } else {
        sku = parts.join(" ");
      }
    }
    
    console.log(`   ✅ Extracted from Product Details: SKU="${sku}"`);
    
    products.push({
      sku,
      size: [size1, size2].filter(Boolean).join(" "),
      quantity: parseInt(qtyStr, 10) || 1,
      color,
      orderNo
    });
    
  } catch (error) {
    console.error('   ❌ Product extraction failed:', error);
  }
  
  return products;
}

function extractDeliveryPartner(chunk: string): string {
  const logisticsCompanies = ['Ecom Express', 'Delhivery', 'DTDC', 'Blue Dart', 'Bluedart', 'Xpressbees', 'Shiprocket'];
  
  // Check for known companies
  for (const company of logisticsCompanies) {
    if (chunk.includes(company)) {
      return company;
    }
  }
  
  // Try COD line
  const codMatch = chunk.match(/COD:[^\n]+\n\s*([^\n]+)/i);
  if (codMatch) {
    const extracted = codMatch[1].trim();
    // Check if it's a known company
    for (const company of logisticsCompanies) {
      if (extracted.includes(company)) {
        return company;
      }
    }
  }
  
  return 'Unknown';
}

export function validateLabel(label: ShippingLabel): ValidationResult {
  const errors: string[] = [];
  if (!label.sku) errors.push('SKU not found');
  if (!label.orderId) errors.push('Order ID not found');
  if (!label.quantity || label.quantity < 1) errors.push('Invalid quantity');
  
  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}