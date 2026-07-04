"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiBox } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { useStoreStore } from "@/lib/store";

export default function ShopsPage() {
	const effectiveUser = useStoreStore((s) => s.effectiveUser);
	const [shops, setShops] = useState<any[]>([]);
	const [storage, setStorage] = useState<any>(null);
	const [loading, setLoading] = useState(true);
    
    // UI selections
    const [selectedShopId, setSelectedShopId] = useState("");
    
    // Modal Transfers
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferItemId, setTransferItemId] = useState("");
    const [transferAmount, setTransferAmount] = useState("");

    // Modal Create Shop
    const [showCreateShopModal, setShowCreateShopModal] = useState(false);
    const [newShopTitle, setNewShopTitle] = useState("");

	useEffect(() => {
		async function loadData() {
			if (!effectiveUser) return;
			try {
				const [shopsRes, storageRes] = await Promise.all([
                    fetch("/api/shops"),
                    fetch("/api/storage")
                ]);
				if (shopsRes.ok) {
                    const data = await shopsRes.json();
                    setShops(data);
                    if (data.length > 0) setSelectedShopId(data[0]._id);
                }
                if (storageRes.ok) setStorage(await storageRes.json());
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		}
		loadData();
	}, [effectiveUser]);

    const handleCreateShop = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/shops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newShopTitle })
        });
        if (res.ok) {
            const newShop = await res.json();
            setShops(prev => [...prev, newShop]);
            setSelectedShopId(newShop._id);
            setShowCreateShopModal(false);
            setNewShopTitle("");
        }
    };

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/shops", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shopId: selectedShopId, itemId: transferItemId, amount: Number(transferAmount) })
        });

        if (res.ok) {
            const { shop: updatedShop, storage: updatedStorage } = await res.json();
            setShops(prev => prev.map(s => s._id === updatedShop._id ? updatedShop : s));
            setStorage(updatedStorage);
            setShowTransferModal(false);
            setTransferItemId("");
            setTransferAmount("");
        }
    };

	if (loading) {
		return (
			<div className="w-full h-full flex flex-col items-center justify-center text-theme-text opacity-70">
				<CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
				<p>Loading Shops...</p>
			</div>
		);
	}

    const selectedShop = shops.find(s => s._id === selectedShopId);

	return (
		<div className="w-full h-full flex flex-col gap-6 px-4 md:px-8 py-6 pb-24 overflow-y-auto scrollbar-hidden">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight">Manage Shops</h1>
                    <p className="text-theme-text/50">Allocate items from your global storage to individual shops.</p>
                </div>
                <button onClick={() => setShowCreateShopModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-theme-accent text-theme-background rounded-full font-semibold hover:opacity-90 transition-all shrink-0">
                    <FiPlus /> Create New Shop
                </button>
			</div>

            {/* Shop Tabs */}
            {shops.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-4 pt-2 scrollbar-hidden border-b border-theme-border/50">
                    {shops.map(shop => (
                        <button 
                            key={shop._id}
                            onClick={() => setSelectedShopId(shop._id)}
                            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center justify-center ${selectedShopId === shop._id ? "bg-theme-accent text-theme-background shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "bg-theme-card border border-theme-border hover:bg-theme-background text-theme-text/70"}`}
                        >
                            {shop.title}
                        </button>
                    ))}
                </div>
            ) : null}

            {selectedShop ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={selectedShop._id} className="flex flex-col gap-6 w-full mt-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-theme-card p-6 lg:p-8 rounded-3xl border border-theme-border/30 shadow-lg relative overflow-hidden gap-4">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
							<FiBox className="text-9xl" />
						</div>
                        <div className="flex flex-col gap-1 relative z-10">
                            <span className="font-bold tracking-widest text-xs uppercase text-theme-accent">Currently Managing</span>
                            <h2 className="text-4xl font-extrabold">{selectedShop.title}</h2>
                            <span className="text-sm font-semibold text-emerald-400 mt-2 bg-emerald-500/10 self-start px-3 py-1 rounded-full">{selectedShop.inventory?.length || 0} unique items allocated</span>
                        </div>
                        <button onClick={() => setShowTransferModal(true)} className="flex items-center gap-2 px-6 py-3 bg-theme-accent/20 border border-theme-accent/30 text-theme-accent rounded-full font-extrabold hover:bg-theme-accent hover:text-theme-background transition-all hover:scale-105 active:scale-95 shadow-xl relative z-10">
                            <FiBox /> Transfer Items to Shop
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {selectedShop.inventory?.map((inv: any, idx: number) => (
                            <div key={idx} className="bg-theme-card border border-theme-border/40 p-5 rounded-2xl flex items-center gap-4 shadow-lg hover:border-theme-accent/40 transition-colors">
                                <div className="p-3 bg-theme-background text-theme-accent rounded-xl border border-theme-border">
                                    <FiBox className="text-2xl" />
                                </div>
                                <div className="flex flex-col flex-1">
                                    <span className="font-bold text-lg truncate max-w-[150px]">{inv.itemId?.name || "Item"}</span>
                                    <div className="flex justify-between text-theme-text/60 text-sm mt-1">
                                        <span>Stock: <span className="font-bold text-theme-text bg-theme-background px-2 py-0.5 rounded-md">{inv.amount}</span></span>
                                        <span>${inv.itemId?.unitPrice}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : (
                <div className="w-full flex-1 flex items-center justify-center text-theme-text/50">
                    No shop selected or created yet.
                </div>
            )}

            {/* Create Shop Modal */}
            <AnimatePresence>
                {showCreateShopModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="bg-theme-card p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-theme-border/50">
                            <h2 className="text-2xl font-bold mb-2">Create New Shop</h2>
                            <p className="text-sm text-theme-text/60 mb-6">Assign a branch name to start tracking localized inventory.</p>
                            
                            <form onSubmit={handleCreateShop} className="flex flex-col gap-4">
                                <input 
                                    value={newShopTitle} 
                                    onChange={e => setNewShopTitle(e.target.value)} 
                                    required
                                    placeholder="Shop Name (e.g. Downtown Branch)" 
                                    className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent text-theme-text"
                                />
                                
                                <div className="flex gap-3 justify-end mt-4">
                                    <button type="button" onClick={() => setShowCreateShopModal(false)} className="px-4 py-2 rounded-xl text-theme-text/60 hover:text-theme-text">Cancel</button>
                                    <button type="submit" className="px-6 py-2 rounded-xl bg-theme-accent text-theme-background font-bold hover:opacity-90">Create Shop</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Transfer Modal */}
            <AnimatePresence>
                {showTransferModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-theme-card p-6 rounded-3xl w-full max-w-md shadow-2xl border border-theme-border/50">
                            <h2 className="text-2xl font-bold mb-4">Transfer to {selectedShop?.title}</h2>
                            <p className="text-sm text-theme-text/60 mb-6">Select an item from global storage to decrement from storage and add to the shop.</p>
                            
                            <form onSubmit={handleTransfer} className="flex flex-col gap-4">
                                <select 
                                    value={transferItemId} 
                                    onChange={e => setTransferItemId(e.target.value)} 
                                    required
                                    className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent text-theme-text"
                                >
                                    <option value="" disabled>Select Item from Storage</option>
                                    {storage?.inventory?.filter((i:any)=>i.amount > 0).map((inv: any) => (
                                        <option key={inv.productId?._id} value={inv.productId?._id}>
                                            {inv.productId?.name} ({inv.amount} in storage)
                                        </option>
                                    ))}
                                </select>
                                
                                <input 
                                    value={transferAmount} 
                                    onChange={e => setTransferAmount(e.target.value)} 
                                    required 
                                    type="number" 
                                    min="1"
                                    placeholder="Amount to transfer" 
                                    className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent text-theme-text" 
                                />
                                
                                <div className="flex gap-3 justify-end mt-4">
                                    <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 rounded-xl text-theme-text/60 hover:text-theme-text">Cancel</button>
                                    <button type="submit" className="px-6 py-2 rounded-xl bg-theme-accent text-theme-background font-bold hover:opacity-90">Confirm Transfer</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
		</div>
	);
}
