export type ItemType = {
  _id: string;
  name: string;
  type?: string;
  unitPrice: number;
  __more: string;
};

export type InventoryShopType = {
  itemId: ItemType;
  amount: number;
};

export type InventoryStoreType = {
  productId: ItemType;
  amount: number;
};

export type StorageType = {
  _id: string;
  inventory: InventoryStoreType[];
  __more: string;
};

export type ShopType = {
  _id: string;
  title: string;
  inventory: InventoryShopType[];
  __more: string;
};
