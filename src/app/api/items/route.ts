import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { dbConnect, Item } from "@/db/model";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        await dbConnect();
        const items = await Item.find({ clerkId: userId });

        return NextResponse.json(items || []);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { name, unitPrice, type } = body;

        await dbConnect();

        const existing = await Item.findOne({ clerkId: userId, name: new RegExp('^' + name + '$', 'i') });
        if (existing) {
            return new NextResponse("Item already exists", { status: 400 });
        }

        const item = await Item.create({ clerkId: userId, name, unitPrice, type });

        return NextResponse.json(item);
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 });
    }
}
