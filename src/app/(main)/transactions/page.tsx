"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiShoppingCart } from "react-icons/fi";
import { CgSpinner } from "react-icons/cg";
import { useStoreStore } from "@/lib/store";
import { InventoryShopType, ShopType } from "@/lib/types";

export default function TransactionsPage() {
  const effectiveUser = useStoreStore((s) => s.effectiveUser);
  const [activeStore, setActiveStore] = useState<ShopType | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [polling, setPolling] = useState(false);

  const [selectedItem, setSelectedItem] = useState<InventoryShopType | null>(
    null,
  );
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellAmount, setSellAmount] = useState("");
  const [sellError, setSellError] = useState("");

// 1. Clean up the useCallback: Isolate dependencies to just the user configuration
const loadData = useCallback(async () => {
  if (!effectiveUser) return;

  const qs = effectiveUser.storeId ? `?storeId=${effectiveUser.storeId}` : "";
  
  try {
    const res = await fetch(`/api/transactions${qs}`);
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        setActiveStore(prev => {
          if (!prev) return data[0];
          const updatedStore = data.find((s: ShopType) => s._id === prev._id);
          return updatedStore || prev;
        });
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}, [effectiveUser]); // Beautifully clean dependencies


// 2. Safely orchestrate the network pacing loop
useEffect(() => {
  let timerId: NodeJS.Timeout;
  let isMounted = true;

  async function poll() {
    setPolling(true);
    await loadData();
    
    if (isMounted) {
      setPolling(false);
      // Wait exactly 15 seconds after the network payload lands
      timerId = setTimeout(poll, 15000);
    }
  }

  // Kick off the initial load
  poll();

  // Tear down timer completely when navigating away
  return () => {
    isMounted = false;
    clearTimeout(timerId);
  };
}, [loadData]);

  const handleSell = async (e: React.SubmitEvent<HTMLFormElement>) => {
    setSyncing(true);
    setSellError("");
    e.preventDefault();
    if (!selectedItem || !activeStore) return;

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: activeStore._id,
          itemId: selectedItem.itemId?._id,
          amountSold: Number(sellAmount),
        }),
      });

      if (res.ok) {
        setActiveStore((prev) => {
          if (!prev) return null;

          const newInv =
            prev?.inventory.map((i: InventoryShopType) => {
              if (i.itemId._id === selectedItem.itemId._id) {
                return { ...i, amount: i.amount - Number(sellAmount) };
              }
              return i;
            }) || prev;
          return { ...prev, inventory: newInv };
        });
        setShowSellModal(false);
        setSellAmount("");
        setSelectedItem(null);
        loadData();
      } else {
        const text = await res.text();
        setSellError(text || "Failed to complete sale.");
      }
    } catch (err: any) {
      setSellError(err.message || "Network Error.");
    } finally {
      setSyncing(false);
    }
  };

  const handleInitSell = (item: InventoryShopType) => {
    setSelectedItem(item);
    setShowSellModal(true);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-theme-text opacity-70">
        <CgSpinner className="animate-spin text-4xl mb-4 text-theme-accent" />
        <p>Loading Store Items...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 px-4 md:px-8 py-6 pb-24 overflow-y-auto scrollbar-hidden">
      <div className="flex flex-col gap-2 border-b border-theme-border/50 pb-6 pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Point of Sale
        </h1>
        <p className="text-theme-text/50">
          Sell items from{" "}
          <span className="text-theme-accent font-bold">
            {activeStore?.title || "your assigned store"}
          </span>
          .
        </p>
      </div>

      {activeStore ? (
        <motion.div className="flex flex-col gap-6 w-full mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeStore.inventory?.map(
              (inv: InventoryShopType, idx: number) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleInitSell(inv)}
                  key={idx}
                  className="bg-theme-card border border-theme-border/40 hover:border-theme-accent/50 p-6 rounded-3xl flex flex-col items-center text-center gap-4 shadow-lg transition-colors group cursor-pointer focus:outline-none"
                >
                  <div className="p-4 bg-theme-accent/10 group-hover:bg-theme-accent/20 transition-colors text-theme-accent rounded-full mb-2">
                    <FiShoppingCart className="text-3xl" />
                  </div>
                  <div className="flex flex-col flex-1 w-full relative">
                    <span className="font-bold text-xl truncate max-w-full text-theme-text group-hover:text-theme-accent transition-colors">
                      {inv.itemId?.name || "Item"}
                    </span>
                    <div className="flex items-center justify-center gap-2 text-theme-text/60 text-sm mt-3 font-medium">
                      <span className="bg-theme-background px-3 py-1 rounded-full">
                        <span className="text-theme-text">{inv.amount}</span> in
                        stock
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">
                        ${inv.itemId?.unitPrice} ea
                      </span>
                    </div>
                  </div>
                </motion.button>
              ),
            )}
          </div>
        </motion.div>
      ) : (
        <div className="w-full flex-1 flex flex-col gap-3 items-center justify-center text-theme-text/50">
          <FiCheckCircle className="text-4xl text-emerald-500/50" />
          <span>No store assigned or no items available.</span>
        </div>
      )}

      {/* Sell Modal */}
      <AnimatePresence>
        {showSellModal && (
          <motion.div
            onClick={() => setShowSellModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-theme-card p-6 rounded-3xl w-full max-w-sm shadow-2xl border border-theme-border/50"
            >
              <h2 className="text-2xl font-bold mb-1">
                Sell {selectedItem?.itemId?.name}
              </h2>
              <p className="text-sm text-theme-text/50 mb-6">
                Current Stock:{" "}
                <span className="font-bold text-theme-text">
                  {selectedItem?.amount}
                </span>
              </p>

              <form onSubmit={handleSell} className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-wider font-bold text-theme-text/60 px-1">
                  Quantity
                </label>
                <input
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  required
                  type="number"
                  min="1"
                  max={selectedItem?.amount}
                  placeholder="Enter amount to sell"
                  className="w-full text-center text-2xl font-bold bg-theme-background border border-theme-border rounded-2xl p-4 outline-none focus:border-theme-accent text-theme-text transition-colors"
                />

                <div className="p-4 bg-theme-accent/5 hidden rounded-2xl /flex justify-between items-center text-theme-accent border border-theme-accent/10">
                  <span className="font-semibold text-sm">
                    Total Sale Value:
                  </span>
                  <span className="font-black text-xl">
                    $
                    {(
                      (Number(sellAmount) || 0) *
                      (selectedItem?.itemId?.unitPrice || 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <AnimatePresence>
                  {sellError && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 font-bold text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                      {sellError}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={syncing}
                    className="w-full py-4 rounded-xl bg-theme-accent text-theme-background font-black text-lg tracking-wide hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {syncing ? <><CgSpinner className="animate-spin text-xl" /> Processing...</> : "Confirm Sale"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSellModal(false)}
                    className="w-full py-3 rounded-xl hover:bg-theme-background text-theme-text/60 hover:text-theme-text font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
