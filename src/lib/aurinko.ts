"use server"
import {auth} from "@clerk/nextjs/server"
import axios from 'axios'
import { getSubscriptionStatus } from "./stripe-actions";
import { db } from "@/server/db";
import { FREE_ACCOUNT_PER_USER, PRO_ACCOUNT_PER_USER } from "@/constant";

// Map Aurinko scopes to Google native scopes
const AURINKO_SCOPE_MAP: { [key: string]: string } = {
"Mail.Read": "https://www.googleapis.com/auth/gmail.readonly",
"Mail.ReadWrite": "https://www.googleapis.com/auth/gmail.modify",
"Mail.Drafts": "https://www.googleapis.com/auth/gmail.compose",
"Mail.Send": "https://www.googleapis.com/auth/gmail.send",
"Calendar.Read": "https://www.googleapis.com/auth/calendar.readonly",
"Calendar.ReadWrite": "https://www.googleapis.com/auth/calendar",
"Tasks.Read": "https://www.googleapis.com/auth/tasks.readonly",
"Tasks.ReadWrite": "https://www.googleapis.com/auth/tasks",
};

export const getAurinkoAuthUrl = async(serviceType: 'Google' | 'Office365') => {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    // Selected scopes based on your needs
    const aurinkoScopes = [
        "Mail.Read", 
        "Mail.ReadWrite", 
        "Calendar.Read",
    ];
    
    // Generate native scopes based on selected Aurinko scopes
    const nativeScopes = aurinkoScopes
        .map(scope => AURINKO_SCOPE_MAP[scope])
        .filter(Boolean);

    const isSubscribed = await getSubscriptionStatus()
    const accounts = await db.account.count({where: {userId}})
    if(isSubscribed){ 
        if(accounts >= PRO_ACCOUNT_PER_USER){
            throw new Error('Account limit reached.')
        }
    } else {
        if(accounts >= FREE_ACCOUNT_PER_USER){
            throw new Error('Account limit reached. Upgrade to Pro to get more accounts.')
        }
    }

    const params = new URLSearchParams({
        clientId: process.env.AURINKO_CLIENT_ID!,
        serviceType,
        scopes: aurinkoScopes.join(' '),
        nativeScopes: nativeScopes.join(' '),
        responseType: "code",
        returnUrl: `${process.env.NEXT_PUBLIC_URL}/api/aurinko/callback`,
        ensureScopes: "true", // Validate all scopes are granted
        ensureAccess: "true", // Validate resource access
        prompt: "consent" // Force re-authentication if needed
    });

    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
}



export const exchangeCodeForAccessToken = async(code: string) => {
    try {
        
        const response = await axios.post(`https://api.aurinko.io/v1/auth/token/${code}`,{} ,{
            auth: {
                username: process.env.AURINKO_CLIENT_ID as string,
                password: process.env.AURINKO_CLIENT_SECRET as string
            }
        })
        // console.log("Access Token Response:", response.data); // Log token response
        
        return response.data as {
            accountId: number,
            accessToken: string,
            userId: string,
            userSession: string
        }
        
    } catch (error) {
        if (axios.isAxiosError(error)){
            console.error(error.response?.data)
        }
        console.error(error)
        }
}

export const getAccountDetails = async (accessToken: string) => {
    try {
        const respones = await axios.get("https://api.aurinko.io/v1/account", {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        return respones.data as {
            email: string,
            name: string

        }
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error fetching account details:', error.response?.data);
        } else {
            console.error('Unexpected error fecthing account details', error);
        }
        throw error
    }
}


