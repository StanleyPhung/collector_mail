import { Account } from "@/lib/account";
import { syncEmailsToDatabase } from "@/lib/sync-to-db";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "node_modules/next/server";

export const POST = async (req: NextRequest) => {
    console.log("Initial sync endpoint hit");
    const body = await req.json()
    const { accountId, userId } = body
    if (!accountId || !userId) {
        return new Response("Missing required parameters: accountId and userId.", { status: 400 });
    }
    
    const dbAccount = await db.account.findUnique({
        where: { 
            id: accountId,
            userId
        }

    })
    if (!dbAccount) { return new Response("Account not found.", { status: 404 }); }

    const account = new Account(dbAccount.accessToken)
    //perform initial sync here
    const response = await account.performInititalSync()

    if(!response){
        return NextResponse.json({error: "Failed to sync emails."}, { status: 500 });
    }
    const {emails,deltaToken} = response
    // console.log('email sync',emails)

    await db.account.update({
        where: { id: accountId },
        data: { nextDeltaToken: deltaToken }
    })
    
    await syncEmailsToDatabase(emails,accountId)
    console.log('sync completed',deltaToken)
    return NextResponse.json({ success: true }, { status: 200 });
}
