import { Request, Response } from 'express';
import { parsePDF } from '../services/pdfParser';
import { extractShippingLabels, validateLabel } from '../services/extractData';
import { ParseResponse, ValidatedLabel, LabelError } from '../types';

export const parsePDFController = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file provided',
      });
      return;
    }

    const file = req.file;

    if (file.mimetype !== 'application/pdf') {
      res.status(400).json({
        success: false,
        error: 'File must be a PDF',
      });
      return;
    }

    console.log(`📄 Processing PDF: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB)`);

    // Step 1: Parse PDF
    const { text, numPages } = await parsePDF(file.buffer);
    console.log(`📊 PDF has ${numPages} pages, extracted ${text.length} characters`);

    // Step 2: Extract labels
    const labels = extractShippingLabels(text);
    console.log(`🏷️  Extracted ${labels.length} labels`);

    // Step 3: Validate each label
    const validatedLabels: ValidatedLabel[] = labels.map(label => ({
      ...label,
      validation: validateLabel(label),
    }));

    const validLabels = validatedLabels.filter(l => l.validation.isValid);
    const invalidLabels = validatedLabels.filter(l => !l.validation.isValid);

    const errors: LabelError[] = invalidLabels.map(l => ({
      labelNumber: l.labelNumber,
      errors: l.validation.errors,
    }));

    const response: ParseResponse = {
      success: true,
      fileName: file.originalname,
      fileSize: file.size,
      numPages: numPages,
      totalLabels: labels.length,
      validLabels: validLabels.length,
      invalidLabels: invalidLabels.length,
      labels: validLabels,
      errors: errors,
    };

    res.json(response);

  } catch (error) {
    console.error('❌ API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: 'Failed to process PDF',
      details: errorMessage,
    });
  }
};