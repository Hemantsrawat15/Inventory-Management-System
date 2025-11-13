"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useBusiness, api } from "../../../providers/GlobalProvider";
import { FaPlus } from "react-icons/fa";
import { Package, DollarSign, Archive, Eye, Edit2, Trash2, X } from "lucide-react";

interface IInventoryItem {
  _id: string;
  title: string;
  price?: number;
  stock?: number;
  hsnCode?: string;
  variation?: string;
}

const EMPTY_ITEM = {
  title: "", category: "", description: "", price: "", stock: "", gst: "",
  inventoryId: "", inventoryName: "", variation: "", hsnCode: "",
  netWeight: "", netQuantity: "", manufacturer: "",
  featuredImage: null as File | null,
};

export default function InventoryPage() {
  const { selectedBusiness, loading: businessLoading } = useBusiness();
  const [inventory, setInventory] = useState<IInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemData, setItemData] = useState(EMPTY_ITEM);
  const [error, setError] = useState("");

  const fetchInventory = async () => {
    if (selectedBusiness) {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/inventory", { params: { gstin: selectedBusiness.gstin } });
        setInventory(res.data);
      } catch (err) {
        setError("Failed to fetch inventory.");
      } finally { setLoading(false); }
    } else {
      setInventory([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [selectedBusiness]);

  const handleInput = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const target = e.target;
    if ('type' in target && target.type === 'file') {
      const fileInput = target as HTMLInputElement;
      const file = fileInput.files ? fileInput.files[0] : null;
      setItemData((prev) => ({ ...prev, [name]: file }));
    } else {
      setItemData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBusiness) {
      setError("Please select a business first.");
      return;
    }
    setError("");

    const formData = new FormData();
    formData.append("gstin", selectedBusiness.gstin);
    for (const key in itemData) {
      const value = itemData[key as keyof typeof itemData];
      if (value !== null && value !== undefined) {
        formData.append(key, value as string | Blob);
      }
    }

    try {
      const { data } = await api.post("/inventory", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setInventory(prev => [...prev, data]);
      setModalOpen(false);
      setItemData(EMPTY_ITEM);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add item.");
    }
  };

  if (businessLoading) {
    return <div className="p-8">Loading business data...</div>;
  }

  if (!selectedBusiness) {
    return <div className="p-4 m-4 bg-yellow-100 text-yellow-800 rounded-md">Please add and select a business on the Profile page.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Inventory Management</h1>
        <button className="flex items-center gap-2 px-5 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md" onClick={() => { setItemData(EMPTY_ITEM); setModalOpen(true); }}><FaPlus /> Add New</button>
      </div>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Current Stock</h2>
        {loading ? <p>Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead><tr className="bg-slate-50"><th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Title</th><th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Price</th><th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Stock</th><th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Variation</th><th className="p-3 text-left text-xs font-bold text-slate-600 uppercase">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-200">
                {inventory.length > 0 ? inventory.map(item => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{item.title}</td><td className="p-3 text-slate-600">₹{item.price}</td><td className="p-3 font-semibold text-slate-600">{item.stock}</td><td className="p-3 text-slate-600">{item.variation || "-"}</td>
                    <td className="p-3"><div className="flex gap-2">
                      <button className="p-2 rounded text-indigo-600 hover:bg-indigo-100" title="View"><Eye size={16} /></button>
                      <button className="p-2 rounded text-yellow-600 hover:bg-yellow-100" title="Edit"><Edit2 size={16} /></button>
                      <button className="p-2 rounded text-red-600 hover:bg-red-100" title="Delete"><Trash2 size={16} /></button>
                    </div></td>
                  </tr>)) : 
                  <tr><td colSpan={5} className="text-center py-8 text-slate-500">No inventory items. Click "Add New" to start.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleAddItem} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative overflow-y-auto max-h-[90vh]">
            <button type="button" onClick={() => setModalOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-red-500"><X size={24} /></button>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">Add New Inventory Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 modal-form-grid">
              <input className="modal-input" name="title" value={itemData.title} onChange={handleInput} placeholder="Title" required />
              <input className="modal-input" name="category" value={itemData.category} onChange={handleInput} placeholder="Category" />
              <input className="modal-input" name="price" type="number" value={itemData.price} onChange={handleInput} placeholder="Price (₹)" required/>
              <input className="modal-input" name="stock" type="number" value={itemData.stock} onChange={handleInput} placeholder="Stock Quantity" required/>
              <input className="modal-input" name="variation" value={itemData.variation} onChange={handleInput} placeholder="Variation (e.g., Size, Color)" />
              <input className="modal-input" name="hsnCode" value={itemData.hsnCode} onChange={handleInput} placeholder="HSN Code" />
              <textarea className="md:col-span-2 modal-input" name="description" value={itemData.description} onChange={handleInput} placeholder="Product Description" rows={3} />
              <div><label className="text-sm text-slate-600">Featured Image</label><input className="mt-1 w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-slate-100" name="featuredImage" type="file" onChange={handleInput} /></div>
            </div>
            <button type="submit" className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-semibold">Save Item</button>
            {error && <div className="mt-4 p-3 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">{error}</div>}
          </form>
        </div>
      )}
      <style jsx global>{`
        .modal-input { border: 1px solid #cbd5e0; padding: 0.75rem; border-radius: 0.5rem; color: #1e293b; }
        .modal-input::placeholder { color: #94a3b8; }
        .modal-form-grid input:-webkit-autofill { -webkit-text-fill-color: #1e293b !important; -webkit-box-shadow: 0 0 0px 1000px #f8fafc inset; }
      `}</style>
    </div>
  );
}