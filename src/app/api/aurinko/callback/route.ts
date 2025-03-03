import { 
    exchangeCodeForAccessToken, 
    getAccountDetails, 
    getAurinkoAuthUrl 
} from "@/lib/aurinko";
import axios from 'axios';
import { waitUntil } from '@vercel/functions';
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const status = params.get("status");

    if (status !== "success") {
        return NextResponse.json({ message: "Failed to link account" }, { status: 400 });
    }

    const code = params.get("code");
    console.log("Authorization code:", code);
    if (!code) {
        return NextResponse.json({ message: "No authorization code provided" }, { status: 400 });
    }

    try {
        // Attempt to exchange the code for an access token
        const token = await exchangeCodeForAccessToken(code as string);
        

        if (!token) {
            throw new Error("Failed to exchange access token");
        }

        // Retrieve account details using the access token
        const accountDetails = await getAccountDetails(token.accessToken);
        try {
            if (!db.account || typeof db.account.upsert !== 'function') {
                console.error("Prisma account model is not properly defined.");
                throw new Error("Database model issue");
            }
            

            await db.account.upsert({
                where: { id: token.accountId.toString() },
                update: {
                    accessToken: token.accessToken,
                },
                create: {
                    id: token.accountId.toString(),
                    userId,
                    emailAddress: accountDetails.email,
                    name: accountDetails.name,
                    accessToken: token.accessToken,
                }
            });
            //trigger initial sync endpoint
            waitUntil(
                axios.post(`${process.env.NEXT_PUBLIC_URL}/api/initial-sync`,{
                    accountId: token.accountId.toString(),
                    userId
                }).then(response => {
                    console.log("Initial sync triggered for account:", response.data)
                }).catch(error => {
                    console.error("Error triggering initial sync:", error);
                })
            )

            return NextResponse.redirect(new URL('/mail',req.url))
        } catch (error: any) {
            console.error("Error during callback processing:", error);
            return NextResponse.json({ message: "Error processing callback" }, { status: 500 });
        }
    
    

    } catch (error: any) {
        // Handle specific error for expired authorization code
        if (error.response?.status === 410) {
            console.error("Authorization code expired. Redirecting to get a new code.");
            
            // Redirect user to get a new authorization code
            const authUrl = await getAurinkoAuthUrl('Google'); // Adjust the service type if necessary
            return NextResponse.redirect(authUrl);
        }

        console.error("Error during callback processing:", error);
        return NextResponse.json({ message: "Error processing callback" }, { status: 500 });
    }
};
