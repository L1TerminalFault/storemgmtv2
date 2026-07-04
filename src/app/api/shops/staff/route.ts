import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { shopId, email } = body;

        if (!shopId || !email) {
            return new NextResponse("Missing shopId or email", { status: 400 });
        }

        const client = await clerkClient();
        const usersRes = await client.users.getUserList({ emailAddress: [email] });

        if (!usersRes.data || usersRes.data.length === 0) {
            return new NextResponse("User not found with this email", { status: 404 });
        }

        const user = usersRes.data[0];

        // Update user metadata to set them as Sales team for this shop
        await client.users.updateUserMetadata(user.id, {
            publicMetadata: {
                ...user.publicMetadata,
                storeId: shopId,
                role: "Sales"
            }
        });

        return NextResponse.json({ success: true, message: "User assigned to shop as Sales agent" });

    } catch (error) {
        console.error("Clerk integration error:", error);
        return new NextResponse("Internal server error when communicating with Clerk", { status: 500 });
    }
}
