import { create } from "zustand";
import type { ShopType, StorageType, ItemType } from "./types";

export type EffectiveUser = {
	userId?: string;
	clerkId?: string;
	storeId?: string | null;
	role: "Admin" | "Sales";
	firstName?: string;
};

type StoreState = {
    effectiveUser: EffectiveUser | null | undefined;
    setEffectiveUser: (value: EffectiveUser | null | undefined) => void;
    availableShops: ShopType[] | undefined;
    setAvailableShops: (value: ShopType[] | undefined) => void;
    storage: StorageType | null | undefined;
    setStorage: (value: StorageType | null | undefined) => void;
    items: ItemType[] | undefined;
    setItems: (value: ItemType[] | undefined) => void;
};

export const useStoreStore = create<StoreState>((set) => ({
    effectiveUser: undefined,
    setEffectiveUser: (value) => set(() => ({ effectiveUser: value })),
    availableShops: undefined,
    setAvailableShops: (value) => set(() => ({ availableShops: value })),
    storage: undefined,
    setStorage: (value) => set(() => ({ storage: value })),
    items: undefined,
    setItems: (value) => set(() => ({ items: value })),
}));
