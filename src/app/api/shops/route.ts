import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { dbConnect, Shop, Storage } from "@/db/model";

export async function GET(req: Request) {
    try {
        // const { isAuthenticated, userId } = await auth({
	// 	acceptsToken: "session_token",
	// });
	
	const state = (await (await clerkClient()).authenticateRequest(req)).toAuth();

	const userId = state?.userId || null;
	console.log("Auth State: ",{ userId } );

        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await dbConnect();
        const allShops = await Shop.find({ clerkId: userId }).populate("inventory.itemId");

        return NextResponse.json(allShops || []);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { title } = body;

        await dbConnect();
        
        const shop = await Shop.create({
            clerkId: userId,
            title,
            inventory: []
        });

        return NextResponse.json(shop);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// In shops logic, we can also add item into the shop (decrements storage)
export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { shopId, itemId, amount } = body;

        await dbConnect();

        const storage = await Storage.findOne({ clerkId: userId });
        if (!storage) return new NextResponse("Storage not found", { status: 404 });

        const storageItem = storage.inventory.find((i: any) => i.productId.toString() === itemId);
        if (!storageItem || storageItem.amount < amount) {
            return new NextResponse("Not enough items in storage", { status: 400 });
        }

        // Decrement from storage
        storageItem.amount -= amount;
        await storage.save();

        let shop = await Shop.findById(shopId);
        if (!shop) return new NextResponse("Shop not found", { status: 404 });

        // Add to shop
        const shopItem = shop.inventory.find((i: any) => i.itemId.toString() === itemId);
        if (shopItem) {
            shopItem.amount += amount;
            if (!shopItem.history) shopItem.history = [];
            shopItem.history.push({ date: new Date(), amountAdded: amount });
        } else {
            shop.inventory.push({ 
                itemId, 
                amount,
                history: [{ date: new Date(), amountAdded: amount }]
            });
        }

        await shop.save();

        return NextResponse.json({ shop, storage });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
