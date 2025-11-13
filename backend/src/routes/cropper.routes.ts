import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware';
import { parsePDF } from '../services/pdfParser'; // Your file
import { extractShippingLabels } from '../services/extractData'; // Your file
import { processExtractedLabels } from '../services/processLabelData';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Store file in memory

// POST /api/cropper/upload
router.post('/upload', protect, upload.single('pdfFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No PDF file uploaded.' });
  }

  try {
    // 1. Parse the PDF buffer
    const parseResult = await parsePDF(req.file.buffer);

    // 2. Extract structured data (labels)
    const labels = extractShippingLabels(parseResult.text);
    if (labels.length === 0) {
      return res.status(400).json({ message: 'No valid shipping labels found in the PDF.' });
    }

    // 3. Process the labels (this contains the core logic)
    await processExtractedLabels(labels, parseResult.text);

    res.status(200).json({
      message: 'PDF processed successfully!',
      labelsFound: labels.length,
      processedLabels: labels,
    });

  } catch (error: any) {
    console.error('Cropper upload processing error:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
});

export default router;