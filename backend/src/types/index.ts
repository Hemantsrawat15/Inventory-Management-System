export interface PDFParseResult {
  text: string;
  numPages: number;
}

export interface ShippingLabel {
  labelNumber: number;
  sku: string | null;
  orderId: string | null;
  quantity: number;
  deliveryPartner: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatedLabel extends ShippingLabel {
  validation: ValidationResult;
}

export interface ParseResponse {
  success: boolean;
  fileName?: string;
  fileSize?: number;
  numPages?: number;
  totalLabels?: number;
  validLabels?: number;
  invalidLabels?: number;
  labels?: ShippingLabel[];
  errors?: LabelError[];
  error?: string;
  details?: string;
}

export interface LabelError {
  labelNumber: number;
  errors: string[];
}