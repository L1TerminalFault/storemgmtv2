import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Storage, Item } from "@/db/model";

export async function GET(req: Request) {
    try {
        const { userId } = await auth({
		acceptsToken: "session_token",
	});
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await dbConnect();
        const storage = await Storage.findOne({ clerkId: userId }).populate("inventory.productId");

        return NextResponse.json(storage || { inventory: [] });
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { itemId, amount } = body;

        await dbConnect();

        let storage = await Storage.findOne({ clerkId: userId });
        if (!storage) {
            storage = await Storage.create({ clerkId: userId, inventory: [] });
        }

        const existingIdx = storage.inventory.findIndex((i: any) => i.productId.toString() === itemId);
        if (existingIdx !== -1) {
            storage.inventory[existingIdx].amount += amount;
        } else {
            storage.inventory.push({ productId: itemId, amount });
        }

        await storage.save();

        const populated = await Storage.findOne({ clerkId: userId }).populate("inventory.productId");
        return NextResponse.json(populated);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
