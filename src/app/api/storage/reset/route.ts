import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Storage, Shop } from "@/db/model";

export async function DELETE(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await dbConnect();

        // Clear Storage inventory for this clerkId
        await Storage.updateMany({ clerkId: userId }, { $set: { inventory: [] } });

        // Clear Shop inventory for this clerkId
        await Shop.updateMany({ clerkId: userId }, { $set: { inventory: [] } });

        return NextResponse.json({ success: true, message: "Inventories reset successfully." });
    } catch (e: any) {
        return new NextResponse(e.message || "Failed to reset inventories.", { status: 500 });
    }
}
