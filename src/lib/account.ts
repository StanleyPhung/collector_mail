import { db } from "@/server/db";
import { EmailAddress, EmailMessage, SyncResponse, SyncUpdatedResponse } from "@/type";
import axios from 'axios';
import { syncEmailsToDatabase } from "./sync-to-db";

export class Account {
    
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async startSync() {
        console.log('Starting sync...');
        const response = await axios.post<SyncResponse>('https://api.aurinko.io/v1/email/sync', {}, {
            headers: {
                Authorization: `Bearer ${this.token}`,
            },
            params: {
                daysWithin: 2,
                bodyType: 'html'
            }
        })
        console.log('Sync started response:', response.data);
        return response.data;
    }

    async getUpdatedEmails({deltaToken, pageToken} : {deltaToken?: string, pageToken?: string}) {
        let params: Record<string, string> = {};
        if (deltaToken) {
            params.deltaToken = deltaToken;
        }
        if (pageToken) {
            params.pageToken = pageToken;
        }
        // console.log('Params:', params);
        const response = await axios.get<SyncUpdatedResponse>(
            `https://api.aurinko.io/v1/email/sync/updated`,
            {
                params,
                headers: { Authorization: `Bearer ${this.token}` }
            }
        );
        return response.data;
    }



    async performInititalSync() {
        try {
            let syncResponse = await this.startSync();
            while (!syncResponse.ready) {
                console.log('Sync not ready, waiting...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                syncResponse = await this.startSync();
            }

            // Get bookmark delta token
            let storedDeltaToken: string = syncResponse.syncUpdatedToken;
            console.log('Delta token:', storedDeltaToken);

            let updatedResponse = await this.getUpdatedEmails({deltaToken: storedDeltaToken});
            console.log('First batch of updated emails:', updatedResponse);

            if(updatedResponse.nextDeltaToken) {
                // Sync has completed
                storedDeltaToken = updatedResponse.nextDeltaToken;
            }
            let allEmails: EmailMessage[] = updatedResponse.records;
            console.log(`Fetched ${allEmails.length} emails so far`);

            // Fetch all pages if there are more
            while(updatedResponse.nextPageToken) {
                console.log('Fetching next page of emails...');
                updatedResponse = await this.getUpdatedEmails({pageToken: updatedResponse.nextPageToken});
                allEmails = allEmails.concat(updatedResponse.records);
                if(updatedResponse.nextDeltaToken) {
                    storedDeltaToken = updatedResponse.nextDeltaToken;
                }
            }
            console.log(`Initial sync completed. ${allEmails.length} emails fetched.`);

            // Store the latest delta token for future incremental syncs
            return {
                emails: allEmails,
                deltaToken: storedDeltaToken,
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Axios Error:', error.message);
                console.error('Error details:', JSON.stringify(error.response?.data, null, 2));
                if (error.response?.status === 403) {
                    console.error('Error: Insufficient permissions. Please check your access token and scopes.');
                    // You might want to trigger a token refresh or re-authentication here
                }
            } else {
                console.error('Unexpected error fetching emails:', error);
            }
            throw error; 
        }
    }

    async syncEmail() {
        const account = await db.account.findUnique({
            where: { accessToken: this.token}
        })
        if (!account) throw new Error('Account  not found')
        if (!account.nextDeltaToken) throw new Error( "account not ready to sync")

        console.log('Starting incremental sync...')
        console.log(account.id)
        console.log('Delta token:', account.nextDeltaToken)

        let response = await this.getUpdatedEmails({deltaToken: account.nextDeltaToken})


        let storedDeltaToken = account.nextDeltaToken
        let allEmails: EmailMessage[] = response.records

        if(response.nextDeltaToken) {
            storedDeltaToken = response.nextDeltaToken
        }



        while(response.nextPageToken) {
            console.log('Fetching next page of emails...');
            response = await this.getUpdatedEmails({pageToken: response.nextPageToken});
            allEmails = allEmails.concat(response.records);
            if(response.nextDeltaToken) {
                storedDeltaToken = response.nextDeltaToken;
            }
        }

        try {
            syncEmailsToDatabase(allEmails, account.id)
        }
        catch(error) {
            console.error('Error syncing emails to database:', error)
        }

        await db.account.update({
            where: { id: account.id },
            data: { nextDeltaToken: storedDeltaToken }
        })

        return {
            updatedEmails: allEmails,
            deltaToken: storedDeltaToken,
        }
    }

    async sendEmail({
        from,
        subject,
        body,
        to,
        inReplyTo,
        threadId,
        reference,
        cc,
        bcc,
        ReplyTo
    }: {
        from: EmailAddress,
        subject: string,
        body: string,
        to: EmailAddress[],
        threadId?: string, 
        inReplyTo?: string,
        reference?: string,
        cc?: EmailAddress[],
        bcc?: EmailAddress[],
        ReplyTo?: EmailAddress
    }) {
        try {
            const response = await axios.post('https://api.aurinko.io/v1/email/messages', { 
            from,
            subject,
            body,
            to,
            inReplyTo,
            reference,
            threadId,
            cc,
            bcc,
            ReplyTo: [ReplyTo]
        },{
            params: {
                returnIds: true    
            },

            headers: {
                Authorization: `Bearer ${this.token}`
            }
        })
        console.log('Email sent:', response.data);
        return response.data

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Axios Error:', error.message);
                console.error('Error details:', JSON.stringify(error.response?.data, null, 2));
                if (error.response?.status === 403) {
                    console.error('Error: Insufficient permissions. Please check your access token and scopes.');
                    // You might want to trigger a token refresh or re-authentication here
                }
            } else {
                console.error('Unexpected error sending email:', error);
            }
            throw error;  // Rethrow the error for the caller to handle
        }
    }

    // In Account.ts (or wherever your Account class is defined)
    // In Account.ts, update the existing updateDraft and sendDraft methods:

    async updateDraft(params: {
        emailId: string;
        body: string;
        subject: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
    }) {
        const { emailId, body, subject, to, cc, bcc } = params;
        
        try {
            const response = await axios.patch(
                `https://api.aurinko.io/v1/email/messages/${emailId}`,
                {
                    subject,
                    body,
                    to,
                    cc: cc || [],
                    bcc: bcc || []
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`
                    }
                }
            );
            
            console.log('Draft updated:', response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Axios Error:', error.message);
                console.error('Error details:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Unexpected error updating draft:', error);
            }
            throw error;
        }
    }

    async sendDraft(params: {
        emailId: string;
        body: string;
        subject: string;
        to: EmailAddress[];
        cc?: EmailAddress[];
        bcc?: EmailAddress[];
    }) {
        // First update the draft with the latest content
        await this.updateDraft(params);
        
        try {
            // Then send the draft
            const response = await axios.post(
                `https://api.aurinko.io/v1/email/messages/${params.emailId}/send`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`
                    }
                }
            );
            
            console.log('Draft sent:', response.data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Axios Error:', error.message);
                console.error('Error details:', JSON.stringify(error.response?.data, null, 2));
            } else {
                console.error('Unexpected error sending draft:', error);
            }
            throw error;
        }
    }
}