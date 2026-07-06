import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Transaction } from "@/db/model";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await dbConnect();
        
        // Fetch logs descending
        const logs = await Transaction.find({ clerkId: userId }).sort({ createdAt: -1 });

        return NextResponse.json(logs);
    } catch (e: any) {
        return new NextResponse(e.message || "Internal Error", { status: 500 });
    }
}
