import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Shop, Transaction } from "@/db/model";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { shopId, itemId, amountSold } = body;

        await dbConnect();

        const shop = await Shop.findById(shopId).populate("inventory.itemId");
        if (!shop) return new NextResponse("Shop not found", { status: 404 });

        const shopItem = shop.inventory.find((i: any) => i.itemId._id.toString() === itemId);
        if (!shopItem || shopItem.amount < amountSold) {
            return new NextResponse("Not enough items in shop", { status: 400 });
        }

        shopItem.amount -= amountSold;
        await shop.save();

        const message = `Item ${shopItem.itemId.name} sold from Shop ${shop.title}`;
        await Transaction.create({ clerkId: shop.clerkId, message });

        return NextResponse.json({ success: true, shop });
    } catch (error: any) {
        return new NextResponse(error.message || "Internal Error", { status: 500 });
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
