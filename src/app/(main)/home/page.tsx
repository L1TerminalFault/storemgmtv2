"use client";

import { useEffect, useCallback, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  // FiTrendingUp,
  FiDollarSign,
  FiPackage,
  FiPlus,
  FiList,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { CgSpinner } from "react-icons/cg";
import { useRouter } from "next/navigation";

import { useStoreStore } from "@/lib/store";
import type {
  InventoryShopType,
  InventoryStoreType,
  ItemType,
  StorageType,
  ShopType,
} from "@/lib/types";

export default function HomeDashboard() {
  const router = useRouter();
  const effectiveUser = useStoreStore((s) => s.effectiveUser);
  const [storage, setStorage] = useState<StorageType | null>(null);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [catalogItems, setCatalogItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modal States
  const [showAddCatalogItemModal, setShowAddCatalogItemModal] = useState(false);
  const [showAddToStorageModal, setShowAddToStorageModal] = useState(false);
  const [showStorageItemsModal, setShowStorageItemsModal] = useState(false);

  // Form States
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const [storageItemId, setStorageItemId] = useState("");
  const [storageItemAmount, setStorageItemAmount] = useState("");

// 1. Separate your fetch logic from the polling state. 
// Remove 'syncing' from this callback's dependencies entirely.
const loadData = useCallback(async () => {
  if (!effectiveUser) return;

  try {
    if (effectiveUser.role === "Sales") {
      // ONLY redirect if we aren't already on the page to prevent layout thrashing
      if (window.location.pathname !== "/transactions") {
        router.replace("/transactions");
      }
      
      const res = await fetch("/api/transactions");
      if (res.ok) setStorage(await res.json());
    } else {
      const [storageRes, shopsRes, itemsRes] = await Promise.all([
        fetch("/api/storage"),
        fetch("/api/shops"),
        fetch("/api/items"),
      ]);
      if (storageRes.ok) setStorage(await storageRes.json());
      if (shopsRes.ok) setShops(await shopsRes.json());
      if (itemsRes.ok) setCatalogItems(await itemsRes.json());
    }
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [effectiveUser, router]); // 'syncing' is no longer here!


// 2. Handle the Polling Orchestration smoothly
useEffect(() => {
  let timerId;
  let isMounted = true;

  async function poll() {
    setSyncing(true);
    await loadData();
    
    if (isMounted) {
      setSyncing(false);
      // Wait 10 seconds AFTER the fetch finishes before polling again
      timerId = setTimeout(poll, 10000); 
    }
  }

  // Kick off the first poll immediately
  poll();

  // CLEANUP: This kills the timer completely when the component unmounts
  return () => {
    isMounted = false;
    clearTimeout(timerId);
  };
}, [loadData]); // Safely fires only if effectiveUser or router changes

  const handleCreateCatalogItem = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    setSyncing(true);
    e.preventDefault();
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newItemName,
        unitPrice: Number(newItemPrice),
        type: "General",
      }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setCatalogItems((prev) => [...prev, newItem]);
      setShowAddCatalogItemModal(false);
      setNewItemName("");
      setNewItemPrice("");
    }
    setSyncing(false);
  };

  const handleAddItemToStorage = async (
    e: React.SubmitEvent<HTMLFormElement>,
  ) => {
    setSyncing(true);
    e.preventDefault();
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: storageItemId,
        amount: Number(storageItemAmount),
      }),
    });
    if (res.ok) {
      const updatedStorage = await res.json();
      setStorage(updatedStorage);
      setShowAddToStorageModal(false);
      setStorageItemAmount("");
      setStorageItemId("");
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-theme-text opacity-70">
        <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  const isAdmin = effectiveUser?.role === "Admin";

  // Calculate metrics
  let storageValue = 0;
  let storageCount = 0;

  if (isAdmin) {
    storage?.inventory.forEach((item: InventoryStoreType) => {
      storageValue += item.amount * item.productId?.unitPrice || 0;
      storageCount += item.amount;
    });
  }

  let shopsValue = 0;
  // let shopsCount = 0;

  shops.forEach((shop) => {
    shop.inventory?.forEach((item: InventoryShopType) => {
      shopsValue += item.amount * item.itemId?.unitPrice || 0;
      // shopsCount += item.amount;
    });
  });

  // Mock Graph
  const chartData = [
    { name: "Week 1", storage: storageValue * 0.8, shops: shopsValue * 0.6 },
    { name: "Week 2", storage: storageValue * 0.9, shops: shopsValue * 0.8 },
    { name: "Week 3", storage: storageValue * 0.95, shops: shopsValue * 0.9 },
    { name: "Week 4", storage: storageValue, shops: shopsValue },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-8 px-4 md:px-8 py-6 pb-24 overflow-y-auto scrollbar-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row w-full justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1 w-full">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome,{" "}
            <span className="text-theme-accent">
              {effectiveUser?.firstName || effectiveUser?.role}
            </span>
            !
          </h1>
          <p className="text-theme-text/50">
            Here is your{" "}
            {isAdmin ? "Global Organization Overview" : "Store Summary"}
          </p>
        </div>
        {isAdmin && effectiveUser && (
          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setShowAddCatalogItemModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-background border border-theme-accent/50 text-theme-accent rounded-full font-semibold hover:bg-theme-accent/10 transition-all shrink-0"
            >
              <FiList /> Draft New Item
            </button>
            <button
              onClick={() => setShowAddToStorageModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-accent text-theme-background rounded-full font-semibold hover:opacity-90 transition-all shrink-0"
            >
              <FiPlus /> Add to Store
            </button>
          </div>
        )}
      </div>

      {/* RESTRUCTURED: Total Remainings on Top */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-theme-border/50 pb-2">
          <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400">
            {isAdmin ? "Total Remainings in Store" : "Store Active Inventory"}
          </h2>
        </div>
        <div
          className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-2" : ""} gap-6 w-full`}
        >
          {isAdmin && effectiveUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col bg-theme-card p-8 rounded-3xl shadow-xl border border-emerald-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <FiDollarSign className="text-9xl" />
              </div>
              <div className="flex flex-col gap-1 relative z-10">
                <span className="font-bold tracking-widest text-xs uppercase text-emerald-400">
                  Total Store Valuation
                </span>
                <h2 className="text-5xl font-extrabold text-theme-text mt-2">
                  ${storageValue.toLocaleString()}
                </h2>
              </div>
            </motion.div>
          )}

          <motion.button
            onClick={() => (isAdmin ? setShowStorageItemsModal(true) : null)}
            whileHover={isAdmin ? { scale: 1.02 } : { scale: 1 }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`flex flex-col text-left bg-theme-card p-8 rounded-3xl shadow-xl border border-sky-500/20 relative overflow-hidden ${isAdmin ? "hover:border-sky-500/50 cursor-pointer focus:outline-none" : "cursor-default pointer-events-none"}`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <FiPackage className="text-9xl" />
            </div>
            <div className="flex flex-col gap-1 relative z-10 pointer-events-none">
              <span className="font-bold tracking-widest text-xs uppercase text-sky-400">
                Physical Remaining Items {isAdmin && "(Click)"}
              </span>
              <h2 className="text-5xl font-extrabold text-theme-text mt-2">
                {storageCount} Items
              </h2>
            </div>
          </motion.button>
        </div>
      </div>

      {/* RESTRUCTURED: Per Shops Money Below */}
      <div className="flex flex-col gap-4 mt-4">
        <div className="flex items-center gap-3 border-b border-theme-border/50 pb-2 flex-col sm:flex-rowjustify-between w-full">
          <h2 className="text-xl font-black uppercase tracking-widest text-orange-400 flex-1">
            Shop Allocations & Valuation
          </h2>
          <div className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full font-bold text-sm">
            Total Distributed: ${shopsValue.toLocaleString()}
          </div>
        </div>
        {isAdmin && shops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shops.map((shop) => {
              let sv = 0;
              let sc = 0;
              shop.inventory.forEach((i: InventoryShopType) => {
                sv += i.amount * i.itemId?.unitPrice || 0;
                sc += i.amount;
              });
              return (
                <motion.div
                  whileHover={{ y: -4 }}
                  key={shop._id}
                  className="bg-theme-card border border-theme-border/40 p-6 rounded-3xl flex flex-col gap-3 shadow-lg hover:shadow-orange-500/10 transition-all"
                >
                  <span className="font-extrabold text-xl truncate">
                    {shop.title}
                  </span>
                  <div className="flex flex-col gap-1 w-full bg-theme-background p-4 rounded-2xl">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-theme-text/50">Valuation</span>
                      <span className="text-orange-400 text-lg">
                        ${sv.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-px bg-theme-border/50 my-1" />
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-theme-text/50">Items count</span>
                      <span className="text-theme-text">{sc}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-theme-text/50 italic py-4">
            No shops registered or allocated yet.
          </div>
        )}
      </div>

      {/* Main Chart Section OR Sales View */}
      {isAdmin && effectiveUser ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full flex flex-col xl:flex-row mt-4"
        >
          <div className="w-full h-87.5 bg-theme-card p-6 rounded-3xl shadow-xl flex flex-col border border-theme-border/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h3 className="text-lg font-bold tracking-wide">
                Assets Trajectory vs Shops Allocation
              </h3>
            </div>
            <div className="flex-1 w-full min-h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 30, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorStorage"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorShops" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--borderCol)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="var(--fg)"
                    opacity={0.5}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--fg)"
                    opacity={0.5}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--cardBg)",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="storage"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorStorage)"
                  />
                  <Area
                    type="monotone"
                    dataKey="shops"
                    stroke="#f97316"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorShops)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-4 mt-4 w-full">
          <h3 className="text-xl font-black uppercase tracking-widest text-emerald-400 mb-2 border-b border-theme-border/50 pb-2">
            Item Allocations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {storage?.inventory
              ?.filter((i: InventoryStoreType) => i.amount > 0)
              .map((inv: InventoryStoreType) => {
                const itemData = inv.productId;
                return (
                  <motion.div
                    key={itemData?._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-theme-card border border-theme-border/40 p-6 rounded-3xl flex flex-col gap-3 shadow-lg"
                  >
                    <span className="font-extrabold text-xl truncate">
                      {itemData?.name}
                    </span>
                    <div className="flex flex-col gap-1 w-full bg-theme-background p-4 rounded-2xl">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-theme-text/50">
                          Current Stock
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold">
                          {inv.amount} Items
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* Modal for adding New Item Catalog */}
      <AnimatePresence>
        {showAddCatalogItemModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddCatalogItemModal(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-theme-card p-6 rounded-3xl w-full max-w-md shadow-2xl border border-theme-border/50"
            >
              <h2 className="text-2xl font-bold mb-2">Draft New Item</h2>
              <p className="text-sm text-theme-text/60 mb-6">
                Create a master template for an item in your catalog.
              </p>
              <form
                onSubmit={handleCreateCatalogItem}
                className="flex flex-col gap-4"
              >
                <input
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  required
                  placeholder="Item Display Name"
                  className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent"
                />
                <input
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  required
                  type="number"
                  step="0.01"
                  placeholder="Item Unit Price ($)"
                  className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent"
                />
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddCatalogItemModal(false)}
                    className="px-4 py-2 rounded-xl text-theme-text/60 hover:text-theme-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-theme-accent text-theme-background font-bold hover:opacity-90"
                  >
                    Draft Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal for adding item to global storage */}
      <AnimatePresence>
        {showAddToStorageModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddToStorageModal(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-theme-card p-6 rounded-3xl w-full max-w-md shadow-2xl border border-theme-border/50"
            >
              <h2 className="text-2xl font-bold mb-2">Restock Store</h2>
              <p className="text-sm text-theme-text/60 mb-6">
                Select an item from your catalog to add physical quantities to
                store.
              </p>
              <form
                onSubmit={handleAddItemToStorage}
                className="flex flex-col gap-4"
              >
                <select
                  value={storageItemId}
                  onChange={(e) => setStorageItemId(e.target.value)}
                  required
                  className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent text-theme-text"
                >
                  <option value="" disabled>
                    Select Item from Catalog
                  </option>
                  {catalogItems.map((cItem: ItemType) => (
                    <option key={cItem._id} value={cItem._id}>
                      {cItem.name} (${cItem.unitPrice})
                    </option>
                  ))}
                </select>
                <input
                  value={storageItemAmount}
                  onChange={(e) => setStorageItemAmount(e.target.value)}
                  required
                  type="number"
                  min="1"
                  placeholder="Quantity to Add"
                  className="w-full bg-theme-background border border-theme-border rounded-xl p-3 outline-none focus:border-theme-accent"
                />
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddToStorageModal(false)}
                    className="px-4 py-2 rounded-xl text-theme-text/60 hover:text-theme-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-theme-accent text-theme-background font-bold hover:opacity-90"
                  >
                    Restock Store
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal for viewing remaining storage items */}
      <AnimatePresence>
        {showStorageItemsModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowStorageItemsModal(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-theme-card p-6 rounded-3xl w-full max-w-md shadow-2xl border border-theme-border/50 max-h-[80vh] flex flex-col flex-nowrap"
            >
              <h2 className="text-2xl font-bold mb-2">Store Inventory</h2>
              <p className="text-sm text-theme-text/60 mb-6 shrink-0">
                List of all items physically remaining in store right now.
              </p>
              <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4 scrollbar-hidden">
                {storage?.inventory
                  ?.filter((i: InventoryStoreType) => i.amount > 0)
                  .map((inv: InventoryStoreType) => {
                    const itemData = inv.productId;
                    return (
                      <div
                        key={itemData?._id}
                        className="flex justify-between items-center bg-theme-background border border-theme-border/50 p-4 rounded-2xl"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-lg">
                            {itemData?.name}
                          </span>
                          <span className="text-xs text-theme-text/50 font-semibold">
                            ${itemData?.unitPrice} ea
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold text-sm">
                            {inv.amount} left
                          </span>
                        </div>
                      </div>
                    );
                  })}
                {(!storage?.inventory || storage.inventory.length === 0) && (
                  <div className="text-center italic text-theme-text/50 py-4">
                    No items remain in store.
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-2 pt-4 border-t border-theme-border/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowStorageItemsModal(false)}
                  className="px-6 py-2 rounded-xl bg-theme-background border border-theme-border text-theme-text font-bold hover:bg-theme-border/50 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
