"use client";

import { useEffect, useRef } from "react";
import Head from "next/head";
import {
  Upload,
  FileText,
  Download,
  Scissors,
  Package,
  Truck,
  Settings,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { useBusiness, api } from "../../../providers/GlobalProvider";

export default function CropperPage() {
  const { selectedBusiness } = useBusiness();
  // Use ref to always have the latest value
  const selectedBusinessRef = useRef(selectedBusiness);

  // Update ref whenever selectedBusiness changes
  useEffect(() => {
    selectedBusinessRef.current = selectedBusiness;
  }, [selectedBusiness]);

  useEffect(() => {
    const initializeCropper = () => {
      const fileInputElement = document.getElementById("fileInput");
      if (
        !fileInputElement ||
        fileInputElement.getAttribute("data-initialized")
      ) {
        return;
      }
      fileInputElement.setAttribute("data-initialized", "true");

      let pdfDoc: any = null,
        pageDataList: any[] = [],
        partnersFound = new Set<string>(),
        skippedPages = 0;

      const TOP_ANCHOR_TEXT = "Customer Address",
        BOTTOM_ANCHOR_TEXT = "SKU",
        partnerPriority = ["delhivery", "ecom express", "shadowfax", "unknown"];

      const downloadButton = document.getElementById(
          "downloadButton"
        ) as HTMLButtonElement,
        message = document.getElementById("message") as HTMLDivElement,
        pagesContainer = document.getElementById(
          "pagesContainer"
        ) as HTMLDivElement,
        progressBar = document.getElementById(
          "progressBar"
        ) as HTMLProgressElement;

      if (!downloadButton || !message || !pagesContainer || !progressBar) {
        console.error("One or more cropper DOM elements were not found.");
        return;
      }

      document.querySelectorAll('input[name="sortBy"]').forEach((radio) => {
        radio.addEventListener("change", sortPages);
      });

      fileInputElement.addEventListener("change", async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        resetUI();
        progressBar.value = 0;
        const fileReader = new FileReader();

        fileReader.onload = async function () {
          const typedarray = new Uint8Array(this.result as ArrayBuffer);
          const pdfjsLib = (window as any).pdfjsLib;
          try {
            const loadingTask = pdfjsLib.getDocument({ data: typedarray });
            pdfDoc = await loadingTask.promise;
            message.className = "flex items-center gap-2 text-slate-700 mt-2";
            message.innerHTML =
              '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Extracting text and rendering pages...';

            // Extract full text from PDF first
            const fullText = await extractFullText(pdfDoc);
            console.log(
              "📄 Full PDF text extracted (first 500 chars):",
              fullText.substring(0, 500) + "..."
            );

            const extractedOrders = await analyzeAndRenderAllPages(
              pdfDoc,
              fullText
            );

            // Get current business from ref
            const currentBusiness = selectedBusinessRef.current;

            // Debug logging
            console.log("📊 Extraction Results:");
            console.log("- Total pages processed:", pageDataList.length);
            console.log("- Orders extracted:", extractedOrders.length);
            console.log("- Selected business:", currentBusiness);
            console.log("- Extracted orders data:", extractedOrders);

            sortPages();
            progressBar.value = 100;

            // Save to database if business is selected
            if (currentBusiness && extractedOrders.length > 0) {
              try {
                message.innerHTML =
                  '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> Saving orders and updating inventory...';

                const response = await api.post("/orders", {
                  gstin: currentBusiness.gstin,
                  orders: extractedOrders,
                });

                const { results } = response.data;

                message.className =
                  "flex items-center gap-2 text-green-600 mt-2 font-medium";
                message.innerHTML = `
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg> 
                                    Processing complete! ${
                                      results.saved
                                    } orders saved, ${
                  results.inventoryUpdated
                } items updated.
                                    ${
                                      results.unmappedSkus.length > 0
                                        ? `<br/><span class="text-yellow-600">⚠️ ${results.unmappedSkus.length} unmapped SKUs found.</span>`
                                        : ""
                                    }
                                `;
              } catch (error: any) {
                console.error("Failed to save orders:", error);
                console.error("Error details:", error.response?.data);
                message.className =
                  "flex items-center gap-2 text-yellow-600 mt-2 font-medium";
                message.innerHTML = `
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                    PDF processed, but failed to save orders: ${
                                      error.response?.data?.message ||
                                      error.message
                                    }
                                `;
              }
            } else {
              let warningMsg = `Processing complete. ${pageDataList.length} labels ready.`;
              if (!currentBusiness) {
                warningMsg +=
                  '<br/><span class="text-yellow-600">⚠️ No business selected. Data not saved. Please select a business in your profile.</span>';
              } else if (extractedOrders.length === 0) {
                warningMsg +=
                  '<br/><span class="text-yellow-600">⚠️ Could not extract Order IDs or SKUs from PDF. Data not saved. Check console for details.</span>';
              }

              message.className =
                "flex items-center gap-2 text-green-600 mt-2 font-medium";
              message.innerHTML = `
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg> 
                                ${warningMsg}
                            `;
            }

            downloadButton.disabled = false;
          } catch (err: any) {
            message.className =
              "flex items-center gap-2 text-red-600 mt-2 font-medium";
            message.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Error loading PDF: ${err.message}`;
          }
        };
        fileReader.readAsArrayBuffer(file);
      });

      // Extract full text from entire PDF with proper line breaks
      async function extractFullText(pdfDoc: any): Promise<string> {
        let fullText = "";
        const numPages = pdfDoc.numPages;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();

          // Group items by Y coordinate to preserve lines
          const itemsByLine: Map<number, any[]> = new Map();

          textContent.items.forEach((item: any) => {
            const y = Math.round(item.transform[5]); // Y coordinate
            if (!itemsByLine.has(y)) {
              itemsByLine.set(y, []);
            }
            itemsByLine.get(y)!.push(item);
          });

          // Sort lines by Y coordinate (top to bottom)
          const sortedYs = Array.from(itemsByLine.keys()).sort((a, b) => b - a);

          // Reconstruct text with line breaks
          sortedYs.forEach((y) => {
            const lineItems = itemsByLine.get(y)!;
            // Sort items in line by X coordinate (left to right)
            lineItems.sort((a, b) => a.transform[4] - b.transform[4]);
            // Join items in the same line with space
            const lineText = lineItems.map((item) => item.str).join(" ");
            fullText += lineText + "\n";
          });

          fullText += "\n"; // Add page break
        }

        return fullText;
      }

      // Extract labels using backend's approach
      function extractLabelsFromText(
        pdfText: string
      ): Array<{
        orderId: string;
        sku: string;
        quantity: number;
        deliveryPartner: string;
      }> {
        const labels: Array<{
          orderId: string;
          sku: string;
          quantity: number;
          deliveryPartner: string;
        }> = [];

        // Split by "Customer Address" - same as backend
        const invoiceChunks = pdfText.split(/(?=Customer Address)/g);
        console.log(`Found ${invoiceChunks.length} invoice chunks`);

        invoiceChunks.forEach((chunk, index) => {
          try {
            if (!chunk || chunk.length < 100) {
              console.log(`Skipping chunk ${index} - too short`);
              return;
            }

            console.log(`\n📦 Processing Chunk ${index + 1}`);

            const products = extractProductsFromChunk(chunk);
            const deliveryPartner = extractDeliveryPartnerFromChunk(chunk);

            products.forEach((product) => {
              if (product.sku && product.orderNo) {
                labels.push({
                  orderId: product.orderNo,
                  sku: product.sku,
                  quantity: product.quantity,
                  deliveryPartner: deliveryPartner,
                });
                console.log(
                  `   ✅ Extracted: SKU="${product.sku}", Order="${product.orderNo}", Partner="${deliveryPartner}"`
                );
              }
            });
          } catch (error) {
            console.error(`Error processing chunk ${index}:`, error);
          }
        });

        return labels;
      }

      function extractProductsFromChunk(
        chunk: string
      ): Array<{ sku: string; orderNo: string; quantity: number }> {
        const products: Array<{
          sku: string;
          orderNo: string;
          quantity: number;
        }> = [];

        try {
          // Find "Product Details" section
          const prodBlockMatch = chunk.match(
            /Product Details\s*([\s\S]*?)(?=TAX INVOICE)/i
          );
          if (!prodBlockMatch) {
            console.log("   ⚠️ No Product Details section found");
            return products;
          }

          const prodText = prodBlockMatch[1].trim();
          const lines = prodText
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

          // Find header line: "SKU Size Qty Color Order No."
          const headerLineIndex = lines.findIndex(
            (line) =>
              /sku/i.test(line) &&
              /size/i.test(line) &&
              /qty/i.test(line) &&
              /color/i.test(line) &&
              /order no/i.test(line)
          );

          if (headerLineIndex === -1) {
            console.log("   ⚠️ Product table header not found");
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

          if (skuLines.length === 1) {
            rawLine = skuLines.join(" ").replace(/,+$/, "").trim();
          }

          if (!rawLine) {
            console.log("   ⚠️ No product data line found");
            return products;
          }

          // Normalize: insert spaces between letters and numbers
          const norm = rawLine
            .replace(/(?<!-)([A-Za-z])(\d)/g, "$1 $2") // "RA8" -> "RA 8"
            .replace(/(\d)([A-Za-z])/g, "$1 $2") // "1Red" -> "1 Red"
            .replace(/([a-z])([A-Z])/g, "$1 $2") // "freeSize" -> "free Size"
            .trim();

          const parts = norm.split(/\s+/);

          // Extract from the end (format: SKU Size Qty Color OrderNo)
          const orderNo = parts.pop() || ""; // Last item
          const color = parts.pop() || ""; // Second to last
          const qtyStr = parts.pop() || "1"; // Third to last - THIS IS THE QUANTITY
          const size2 = parts.pop() || ""; // Fourth to last
          const size1 = parts.pop() || ""; // Fifth to last

          // Everything else is the SKU
          let sku = "";
          if (skuLines.length > 1) {
            // Multi-line SKU
            sku = skuLines.join(" ");
          } else {
            // Single-line SKU - everything before size
            const phrase = `${size1} ${size2}`.toLowerCase();
            const idx = rawLine.toLowerCase().indexOf(phrase);
            if (idx > 0) {
              sku = rawLine.substring(0, idx).trim();
            } else {
              sku = parts.join(" ");
            }
          }

          // Parse quantity - could be "1", "2", "10", etc.
          const quantity = parseInt(qtyStr, 10) || 1;

          console.log(
            `   ✅ Extracted SKU: "${sku}", Order: "${orderNo}", Qty: ${quantity}`
          );

          products.push({
            sku,
            quantity: quantity, // ← Use extracted quantity
            orderNo,
          });
        } catch (error) {
          console.error("   ❌ Product extraction failed:", error);
        }

        return products;
      }

      function extractDeliveryPartnerFromChunk(chunk: string): string {
        const logisticsCompanies = [
          "Ecom Express",
          "Delhivery",
          "DTDC",
          "Blue Dart",
          "Bluedart",
          "Xpressbees",
          "Shiprocket",
          "Shadowfax",
        ];

        for (const company of logisticsCompanies) {
          if (chunk.includes(company)) {
            return company;
          }
        }

        return "Unknown";
      }

      async function analyzeAndRenderAllPages(pdfDoc: any, fullText: string) {
        const numPages = pdfDoc.numPages;

        // Extract orders from full text using backend approach
        const extractedOrders = extractLabelsFromText(fullText);

        // Render pages for cropping
        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const { topY, bottomY } = findPageAnchors(textContent);

          if (topY == null || bottomY == null) {
            skippedPages++;
            progressBar.value = 10 + (i / numPages) * 50;
            continue;
          }

          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;

          const pageWrapper = document.createElement("div");
          pageWrapper.className =
            "border border-slate-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow";
          pageWrapper.appendChild(canvas);
          pagesContainer.appendChild(pageWrapper);

          pageDataList.push({
            pageIndex: i - 1,
            cropRegion: calculateCropRegion(topY, bottomY, viewport.height),
          });
          progressBar.value = 10 + (i / numPages) * 50;
        }

        return extractedOrders;
      }

      function findPageAnchors(textContent: any) {
        let topY: number | null = null;
        let bottomY: number | null = null;

        textContent.items.forEach((item: any) => {
          const text = item.str.trim();
          const y = item.transform[5];

          if (text.includes(TOP_ANCHOR_TEXT)) topY = y;
          if (text.includes(BOTTOM_ANCHOR_TEXT)) bottomY = y;
        });

        return { topY, bottomY };
      }

      function calculateCropRegion(
        topY: number,
        bottomY: number,
        pageHeight: number
      ) {
        if (topY != null && bottomY != null) {
          const y1 = pageHeight + 26 - Math.max(topY, bottomY);
          return { x: 0, y: y1, w: 595, h: bottomY };
        }
        return { x: 0, y: 0, w: 595, h: pageHeight };
      }

      function sortPages() {
        // Sorting logic placeholder
      }

      downloadButton.addEventListener("click", async () => {
        try {
          const file = (fileInputElement as HTMLInputElement).files?.[0];
          if (!file) return;
          const arrayBuffer = await file.arrayBuffer();
          const layoutMode = (
            document.querySelector(
              'input[name="layoutMode"]:checked'
            ) as HTMLInputElement
          ).value;
          const { PDFDocument } = (window as any).PDFLib;

          const pdfDoc = await PDFDocument.load(new Uint8Array(arrayBuffer));
          const outputPdf = await PDFDocument.create();

          if (layoutMode === "label") {
            for (let i = 0; i < pageDataList.length; i++) {
              const { pageIndex, cropRegion } = pageDataList[i];
              const [copiedPage] = await outputPdf.copyPages(pdfDoc, [
                pageIndex,
              ]);
              copiedPage.setCropBox(
                cropRegion.x,
                cropRegion.y,
                cropRegion.w,
                cropRegion.h
              );
              outputPdf.addPage(copiedPage);
            }
          }

          const outputBytes = await outputPdf.save();
          downloadPDF(outputBytes, "lebely-cropped.pdf");
          message.className =
            "flex items-center gap-2 text-green-600 mt-2 font-medium";
          message.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Download complete.`;
        } catch (error: any) {
          message.className =
            "flex items-center gap-2 text-red-600 mt-2 font-medium";
          message.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Error creating PDF: ${error.message}`;
        }
      });

      function downloadPDF(pdfBytes: Uint8Array, fileName: string) {
        const safeBytes = new Uint8Array(pdfBytes);
        const blob = new Blob([safeBytes], { type: "application/pdf" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }

      function resetUI() {
        message.innerHTML = "";
        pagesContainer.innerHTML = "";
        pageDataList = [];
        partnersFound.clear();
        downloadButton.disabled = true;
        progressBar.value = 0;
      }
    };

    const loadScript = (src: string, id: string): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const existingScript = document.getElementById(id);
        if (existingScript) {
          console.log(`✅ Script already loaded: ${id}`);
          resolve();
          return;
        }

        console.log(`📥 Loading script: ${src}`);
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = false;

        script.onload = () => {
          console.log(`✅ Successfully loaded: ${id}`);
          resolve();
        };

        script.onerror = (error) => {
          console.error(`❌ Failed to load script: ${src}`, error);
          reject(new Error(`Failed to load script ${src}`));
        };

        document.head.appendChild(script);
      });
    };

    const waitForLibrary = (
      checkFn: () => boolean,
      timeout = 3000
    ): Promise<void> => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
          if (checkFn()) {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error("Timeout waiting for library"));
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    };

    const initializeWithScripts = async () => {
      try {
        console.log("🚀 Starting script initialization...");

        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js",
          "pdfjs-lib-script"
        );

        await waitForLibrary(() => !!(window as any).pdfjsLib);
        console.log("✅ PDF.js library verified");

        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js";
        console.log("✅ PDF.js worker configured");

        await loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
          "pdflib-script"
        );

        await waitForLibrary(() => !!(window as any).PDFLib);
        console.log("✅ PDF-lib library verified");

        console.log("🎯 Initializing cropper...");
        initializeCropper();
        console.log("✅ Cropper initialized successfully");
      } catch (error) {
        console.error("❌ Script loading error:", error);
        const messageDiv = document.getElementById("message");
        if (messageDiv) {
          messageDiv.className =
            "flex items-center gap-2 text-red-600 mt-2 font-medium";
          messageDiv.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Error loading required libraries. Please check your internet connection and refresh the page.
                    `;
        }
      }
    };

    setTimeout(initializeWithScripts, 100);
  }, []);

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100">
      <Head>
        <title>PDF Label Cropper</title>
      </Head>

      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Business Status Warning */}
        {!selectedBusiness && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">
                  No Business Selected
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please select a business in your{" "}
                  <a href="/profile" className="underline font-semibold">
                    profile
                  </a>{" "}
                  to save order data and update inventory automatically.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Business Info */}
        {selectedBusiness && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-semibold text-blue-800">
                  Active Business
                </h3>
                <p className="text-sm text-blue-700">
                  {selectedBusiness.brandName} ({selectedBusiness.gstin})
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 lg:p-8 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                Meesho Shipping Label Crop Tool
              </h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">
                Upload your PDF and your labels will be cropped according to
                delivery partners.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Select PDF File
              </span>
              <input
                type="file"
                id="fileInput"
                accept="application/pdf"
                className="block w-full text-sm text-slate-600 mt-2 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer file:transition-colors cursor-pointer border border-slate-200 rounded-lg p-2"
              />
            </label>

            <div className="border-t border-slate-200 pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Layout Mode
              </label>
              <div className="flex gap-3 flex-wrap mt-2">
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="layoutMode"
                    value="label"
                    defaultChecked
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    Label Printer
                  </span>
                </label>
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="layoutMode"
                    value="a4"
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    A4 Layout
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Invoice Mode
              </label>
              <div className="flex gap-3 flex-wrap mt-2">
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="invoiceMode"
                    value="without"
                    defaultChecked
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    Without Invoices
                  </span>
                </label>
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="invoiceMode"
                    value="with"
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    With Invoices
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Sort By
              </label>
              <div className="flex gap-3 flex-wrap mt-2">
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="sortBy"
                    value="sku"
                    defaultChecked
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    SKU
                  </span>
                </label>
                <label className="radio-label flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all hover:border-slate-300">
                  <input
                    type="radio"
                    name="sortBy"
                    value="partner"
                    className="hidden"
                  />
                  <span className="font-medium text-slate-700 text-sm">
                    Delivery Partner
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Processing Progress
              </label>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden mt-2">
                <progress
                  id="progressBar"
                  value="0"
                  max="100"
                  className="w-full h-full"
                />
              </div>
              <style jsx>{`
                progress {
                  appearance: none;
                }
                progress::-webkit-progress-bar {
                  background-color: #e2e8f0;
                  border-radius: 9999px;
                }
                progress::-webkit-progress-value {
                  background: linear-gradient(to right, #3b82f6, #2563eb);
                  border-radius: 9999px;
                  transition: width 0.3s ease;
                }
                progress::-moz-progress-bar {
                  background: linear-gradient(to right, #3b82f6, #2563eb);
                  border-radius: 9999px;
                }
                .radio-label:has(input:checked) {
                  border-color: #2563eb;
                  background-color: #eff6ff;
                }
                .radio-label:has(input:checked) span {
                  color: #2563eb;
                  font-weight: 600;
                }
              `}</style>
              <div id="message" className="mt-2 text-sm"></div>
            </div>

            <button
              id="downloadButton"
              disabled
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:shadow-none mt-4"
            >
              <Download className="w-5 h-5" />
              Download Cropped PDF
            </button>
          </div>
        </div>

        <div
          id="pagesContainer"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6"
        ></div>
      </div>
    </div>
  );
}
