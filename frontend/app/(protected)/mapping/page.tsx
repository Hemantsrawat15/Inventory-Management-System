"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import { FaLink } from "react-icons/fa";

interface InventoryItem {
  _id: string;
  title: string;
}
interface MappedProduct {
  inventoryItem: { _id: string; title: string };
  quantity: number;
}
interface SkuMapping {
  _id: string;
  sku: string;
  manufacturingPrice: number;
  packagingCost: number;
  mappedProducts: MappedProduct[];
}

export default function MappingPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mappings, setMappings] = useState<SkuMapping[]>([]);
  const [mustMappedSkus, setMustMappedSkus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    "mapping" | "mustMapped" | "unmapped"
  >("mapping");

  const [sku, setSku] = useState("");
  const [mfgPrice, setMfgPrice] = useState("");
  const [packagingCost, setPackagingCost] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    { id: string; quantity: number }[]
  >([]);

  useEffect(() => {
    if (selectedBusiness) {
      setLoading(true);
      setError("");
      Promise.all([
        api.get("/inventory", { params: { gstin: selectedBusiness.gstin } }),
        api.get("/mappings", { params: { gstin: selectedBusiness.gstin } }),
        api.get("/mappings/unmapped", {
          params: { gstin: selectedBusiness.gstin },
        }),
      ])
        .then(([invRes, mapRes, unmappedRes]) => {
          setInventory(invRes.data);
          setMappings(mapRes.data);
          setMustMappedSkus(unmappedRes.data);
        })
        .catch(() => setError("Failed to fetch page data."))
        .finally(() => setLoading(false));
    } else {
      setInventory([]);
      setMappings([]);
      setMustMappedSkus([]);
    }
  }, [selectedBusiness]);

  const handleCreateMapping = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness || !sku || selectedProducts.length === 0) {
      setError("SKU and at least one product selection are required.");
      return;
    }
    setError("");

    const mappingData = {
      gstin: selectedBusiness.gstin,
      sku,
      manufacturingPrice: mfgPrice,
      packagingCost,
      mappedProducts: selectedProducts.map((p) => ({
        inventoryItem: p.id,
        quantity: p.quantity,
      })),
    };

    try {
      const { data } = await api.post("/mappings", mappingData);
      setMappings((prev) => [...prev, data]);
      setMustMappedSkus((prev) => prev.filter((s) => s !== sku)); // Remove from must-map list on success
      setSku("");
      setMfgPrice("");
      setPackagingCost("");
      setSelectedProducts([]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create mapping.");
    }
  };

  const handleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.some((p) => p.id === productId)
        ? prev.filter((p) => p.id !== productId)
        : [...prev, { id: productId, quantity: 1 }]
    );
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
      )
    );
  };

  const handleMustMapClick = (skuToMap: string) => {
    setSku(skuToMap);
    setActiveTab("mapping");
  };

  if (businessLoading)
    return <div className="p-8">Loading business data...</div>;
  if (!selectedBusiness)
    return (
      <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">
        Please select a business to manage SKU mappings.
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">SKU Mapping</h1>
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab("mapping")}
            className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "mapping"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Product Mapping
          </button>
          <button
            onClick={() => setActiveTab("mustMapped")}
            className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "mustMapped"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Must Mapped SKUs ({mustMappedSkus.length})
          </button>
          <button
            onClick={() => setActiveTab("unmapped")}
            className={`px-3 py-2 font-medium text-sm rounded-t-lg ${
              activeTab === "unmapped"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Unmapped Catalog
          </button>
        </nav>
      </div>

      {loading && <p>Loading data...</p>}

      {activeTab === "mapping" && (
        <form
          onSubmit={handleCreateMapping}
          className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Create New Mapping
            </h2>
            <p className="text-slate-500 text-sm">
              Link a sales SKU to your inventory items.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Enter Sales SKU"
                className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400"
                required
              />
              <input
                type="number"
                value={mfgPrice}
                onChange={(e) => setMfgPrice(e.target.value)}
                placeholder="Manufacturing Price (₹)"
                className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="number"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
                placeholder="Packaging Cost (₹)"
                className="w-full p-2 border rounded-md text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label className="font-semibold text-slate-700">
                Select Inventory Products
              </label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-2 max-h-40 overflow-y-auto">
                {inventory.map((item) => (
                  <label
                    key={item._id}
                    className="flex items-center gap-2 p-2 rounded-md cursor-pointer has-[:checked]:bg-blue-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.some((p) => p.id === item._id)}
                      onChange={() => handleProductSelection(item._id)}
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700 text-sm">{item.title}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          {selectedProducts.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2 text-slate-800">
                Set Quantities
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 text-sm">
                    <span className="flex-1 text-slate-700">
                      {inventory.find((i) => i._id === p.id)?.title}
                    </span>
                    <input
                      type="number"
                      value={p.quantity}
                      onChange={(e) =>
                        handleQuantityChange(p.id, parseInt(e.target.value))
                      }
                      className="w-20 p-1 border rounded-md text-center text-slate-900"
                      min="1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg flex items-center gap-2 text-white font-semibold"
            >
              <FaLink /> Map Products
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm font-medium">{error}</div>
          )}
        </form>
      )}

      {activeTab === "mustMapped" && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
          <div className="p-6">
            <h2 className="text-xl font-bold text-black">
              Must Mapped SKUs
            </h2>
            <p className="text-slate-500 text-sm">
              Click "Map SKU" to pre-fill the form and resolve the mapping.
            </p>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left text-slate-600 font-semibold uppercase">
                  SKU
                </th>
                <th className="p-3 text-left text-slate-600 font-semibold uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {mustMappedSkus.length > 0 ? (
                mustMappedSkus.map((skuStr, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 font-mono text-black">{skuStr}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleMustMapClick(skuStr)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1 rounded-md"
                      >
                        Map SKU
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-slate-500">
                    No unmapped SKUs found. Great job!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
