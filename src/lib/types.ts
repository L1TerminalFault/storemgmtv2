export type ItemType = {
	name: string;
	type?: string;
	unitPrice: number;
};

export type StorageType = {
	inventory: ItemType[];
};

export type ShopType = {
	name: string;
	inventory: ItemType[];
};

