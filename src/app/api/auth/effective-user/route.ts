import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await currentUser();

        const role = user?.publicMetadata?.role || "Admin"; // Default to Admin for now
        const storeId = user?.publicMetadata?.storeId || null;

        return NextResponse.json({
            userId,
            clerkId: userId,
            storeId,
            role,
            firstName: user?.firstName || "Admin"
        });

    } catch (error) {
        console.error("Auth error", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
