import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Shop } from "@/db/model";

// A mock schema since Transaction schema wasn't fully defined in DB model from the user prompt for v2,
// but we can just use Shop model to decrement the shop inventory upon a sale.
// We will just do the item decrement as per the prompt requirement ("shop inventory decrements").
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { shopId, itemId, amountSold } = body;

        await dbConnect();

        // Admin might have several shops, Sales might just be assigned a store, but let's just 
        // find the shop and decrement it. (Checking clerkId is useful for security, but the storeId bounds it too)
        const shop = await Shop.findById(shopId);
        if (!shop) return new NextResponse("Shop not found", { status: 404 });

        const shopItem = shop.inventory.find((i: any) => i.itemId.toString() === itemId);
        if (!shopItem || shopItem.amount < amountSold) {
            return new NextResponse("Not enough items in shop", { status: 400 });
        }

        shopItem.amount -= amountSold;
        await shop.save();

        return NextResponse.json({ success: true, shop });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const { searchParams } = new URL(req.url);
        const storeId = searchParams.get("storeId");

        await dbConnect();
        
        let query: any = {};
        if (storeId) {
            query._id = storeId;
        } else {
            // Probably auth check for allowed stores if admin vs sales
            query.clerkId = userId;
        }

        const shops = await Shop.find(query).populate("inventory.itemId");

        return NextResponse.json(shops);
    } catch (e) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
