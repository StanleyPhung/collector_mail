// Import necessary modules and types from the tRPC framework and Zod library for input validation
import { db } from "@/server/db";
import { createTRPCRouter, privateProcedure } from "../trpc";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { emailAddressSchema } from "@/type";
import { Account } from "@/lib/account";
import { OramaClient } from "@/lib/oramaClient";
import { FREE_CREDITS_PER_DAY } from "@/constant";

// Define a function to authorize access to account-related operations
// This function takes two parameters: accountId (string) and userId (string)
export const authorizeAccountAccess = async (accountId: string, userId: string) => {
    // Use Prisma's findFirst method to retrieve account data from the database
    // The where clause filters the accounts based on the provided accountId and userId
    // The select clause specifies the fields to be returned
    const account = await db.account.findFirst({
        where: {
            id: accountId,
            userId
        },
        select: {
            id: true,
            emailAddress: true,
            name: true,
            accessToken: true
        }
    })

    // If no account is found, throw an error
    if (!account) {
        throw new Error("Account not found");
    }

    // Return the authorized account
    return account;
};

// Define the main router for account-related operations
export const accountRouter = createTRPCRouter({
    // Define a private query to retrieve a list of accounts associated with the authenticated user
    getAccounts: privateProcedure.query(async ({ ctx }) => {
        // Use Prisma's findMany method to retrieve account data from the database
        // The where clause filters the accounts based on the authenticated user's ID
        // The select clause specifies the fields to be returned
        return await ctx.db.account.findMany({
            where: {
                userId: ctx.auth.userId
            },
            select: {
                id: true,
                emailAddress: true,
                name: true
            }
        });
    }),

    // Define a private input query to retrieve the number of threads for a specific account and tab
    getNumThreads: privateProcedure.input(
        // Define input validation using Zod's z.object and z.string types
        z.object({
            accountId: z.string(),
            tab: z.string()
        })
    ).query(async ({ ctx, input }) => {
        // Authorize access to the specified account
        const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId);

        // Define a filter object based on the provided tab
        let filter: Prisma.ThreadWhereInput = {};
        if (input.tab === 'inbox') {
            filter = { inboxStatus: true };
        } else if (input.tab === 'draft') {
            filter = { draftStatus: true };
        } else if (input.tab === 'sent') {
            filter = { sentStatus: true };
        }

        console.log(`Getting count for tab ${input.tab} with filter:`, filter);


        // Use Prisma's count method to retrieve the number of threads that match the filter criteria
        return await ctx.db.thread.count({
            where: {
                accountId: account.id,
                ...filter
            }
        });
    }),

    // Define a private input query to retrieve threads for a specific account and tab
    getThreads: privateProcedure.input(
        z.object({
            accountId: z.string(),
            tab: z.string(),
            done: z.boolean()
        })
    ).query(async ({ ctx, input }) => {
        // Authorize access to the specified account
        const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId);
        const acc = new Account(account.accessToken)

        acc.syncEmail().catch(console.error)

        // Define a filter object based on the provided tab and done status
        let filter: Prisma.ThreadWhereInput = {};
        if (input.tab === 'inbox') {
            filter = { inboxStatus: true };
        } else if (input.tab === 'draft') {
            filter = { draftStatus: true };
        } else if (input.tab === 'sent') {
            filter = { sentStatus: true };
        }

        filter.done = {
            equals: input.done
        };

        // Use Prisma's findMany method to retrieve threads that match the filter criteria
        // Include the related emails in the result
        // Limit the number of threads returned to 15
        // Order the threads by the lastMessageDate in descending order
        return await ctx.db.thread.findMany({
            where: filter,
            include: {
                emails: {
                    orderBy: {
                        sentAt: 'asc'
                    },
                    select: {
                        from: true,
                        body: true,
                        bodySnippet: true,
                        emailLabel: true,
                        subject: true,
                        sysLabels: true,
                        id: true,
                        sentAt: true,
                    }
                }
            },
            take: 15,
            orderBy: {
                lastMessageDate: 'desc'
            }
        });
    }),
    getSuggestions: privateProcedure.input(z.object({
        accountId: z.string(),
    })).query(async ({ctx,input}) => {
        const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId)
        return await ctx.db.emailAddress.findMany({
            where: {
                accountId: account.id
            },
            select: {
                address: true,
                name: true,
            }
        })
    }),
    getReplyDetails: privateProcedure.input(z.object({
        accountId: z.string(),
        threadId: z.string(),
    })).query(async ({ctx,input}) => {
        const account = await authorizeAccountAccess(input.accountId,ctx.auth.userId)
        const thread = await ctx.db.thread.findUnique({
            where: {
                id: input.threadId,
            },
            include: {
                emails: {
                    orderBy: {
                        sentAt: 'asc'
                    },
                    select: {
                        from: true,
                        to: true,
                        cc: true,
                        bcc: true,
                        subject: true,
                        sentAt: true,
                        internetMessageId: true,
                        emailLabel: true, // Added emailLabel to help identify drafts

                    }
                }
            }
        })
        if ( !thread || thread.emails.length === 0) throw new Error("Thread not found")

        const lastExternalEmail = thread.emails.reverse().find(email => email.from.address !== account.emailAddress)
        if (lastExternalEmail) {
            // If we found an external email, use it for reply details
            return {
                subject: lastExternalEmail.subject,
                to: [lastExternalEmail.from, ...lastExternalEmail.to.filter(to => to.address !== account.emailAddress)],
                cc: lastExternalEmail.cc.filter(cc => cc.address !== account.emailAddress),
                from: {name: account.name, address: account.emailAddress},
                id: lastExternalEmail.internetMessageId
            }
        } else {
            // If no external email found, use the latest email in the thread
            const latestEmail = thread.emails[0]; // We already reversed the array
            
            // For drafts, continue the draft
        if (latestEmail?.emailLabel === 'draft') {
            return {
                subject: latestEmail.subject ?? "",
                to: latestEmail.to.map(to => ({ address: to.address ?? "", name: to.name ?? "" })) ?? [],
                cc: latestEmail.cc.map(cc => ({ address: cc.address ?? "", name: cc.name ?? "" })) ?? [],
                from: { name: account.name ?? "", address: account.emailAddress },
                id: latestEmail.internetMessageId ?? "",
            };
        }

            // For sent emails without replies, set up a continuation
            // This typically means the recipients would be the same
            return {
                subject: latestEmail?.subject.startsWith("Re:") ? latestEmail.subject ?? "" : `Re: ${latestEmail?.subject ?? ""}`,
                to: latestEmail?.to.map(to => ({ address: to.address ?? "", name: to.name ?? "" })) ?? [],
                cc: latestEmail?.cc.map(cc => ({ address: cc.address ?? "", name: cc.name ?? "" })) ?? [],
                from: { name: account.name ?? "", address: account.emailAddress },
                id: latestEmail?.internetMessageId ?? "",
            };
        }
    }),
    sendEmail: privateProcedure.input(z.object({
        accountId: z.string(),
        body: z.string(),
        subject: z.string(),
        to: z.array(emailAddressSchema),
        cc: z.array(emailAddressSchema).optional(),
        bcc: z.array(emailAddressSchema).optional(),
        from: emailAddressSchema,

        inReplyTo:  z.string().optional(),
        threadId: z.string().optional(),
        replyTo: emailAddressSchema,

    })).mutation(async({ctx, input}) => {
        const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId)
        const acc = new Account(account.accessToken)
        await acc.sendEmail({
            from: input.from,
            body: input.body,
            subject: input.subject,
            to: input.to,
            cc: input.cc,
            bcc: input.bcc,
            inReplyTo: input.inReplyTo,
            threadId: input.threadId,
            ReplyTo: input.replyTo
            
        })
    }),


    searchEmail: privateProcedure.input(z.object({
        account: z.string(),
        query: z.string(),
    })).mutation(async({ctx, input} ) => {

        const account = await authorizeAccountAccess(input.account, ctx.auth.userId)
        const orama = new OramaClient(account.id)
        await orama.initialize()
        const results = await orama.search({term: input.query})
        return results
    }),
    getChatbotInteraction: privateProcedure.input(z.object({
        accountId: z.string()
    }))
    .query(async ({ ctx,input }) => {
        const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId)
        const today = new Date().toDateString()
        const chatbotInteraction = await ctx.db.chatbotInteraction.findUnique({
            where: {
                day: today,
                userId: ctx.auth.userId
            }, select: { count: true }
        })
        const remainingCredits = FREE_CREDITS_PER_DAY - (chatbotInteraction?.count || 0)
        return {
            remainingCredits
        }
    }),

    // In accountRouter.ts
updateDraft: privateProcedure.input(z.object({
    accountId: z.string(),
    emailId: z.string(),
    draftData: z.object({
      body: z.string(),
      subject: z.string(),
      to: z.array(emailAddressSchema),
      cc: z.array(emailAddressSchema).optional(),
      bcc: z.array(emailAddressSchema).optional(),
    })
  })).mutation(async({ctx, input}) => {
    const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId);
    const acc = new Account(account.accessToken);
    
    // Update the draft in email service (e.g. Gmail)
    await acc.updateDraft({
      emailId: input.emailId,
      body: input.draftData.body,
      subject: input.draftData.subject,
      to: input.draftData.to,
      cc: input.draftData.cc,
      bcc: input.draftData.bcc,
    });
    
    // Also update in local database
    await ctx.db.email.update({
      where: { id: input.emailId },
      data: {
        subject: input.draftData.subject,
        body: input.draftData.body,
        bodySnippet: input.draftData.body.substring(0, 100), // Create a brief snippet
        lastModifiedTime: new Date(),
      }
    });
    
    return { success: true };
  }),
  
  // Add this endpoint to send a saved draft
  sendDraft: privateProcedure.input(z.object({
    accountId: z.string(),
    emailId: z.string(),
    draftData: z.object({
      body: z.string(),
      subject: z.string(),
      to: z.array(emailAddressSchema),
      cc: z.array(emailAddressSchema).optional(),
      bcc: z.array(emailAddressSchema).optional(),
    })
  })).mutation(async({ctx, input}) => {
    const account = await authorizeAccountAccess(input.accountId, ctx.auth.userId);
    const acc = new Account(account.accessToken);
    
    // Send the draft
    await acc.sendDraft({
      emailId: input.emailId,
      body: input.draftData.body,
      subject: input.draftData.subject,
      to: input.draftData.to,
      cc: input.draftData.cc,
      bcc: input.draftData.bcc,
    });
    
    // Update email status in local database
    await ctx.db.email.update({
      where: { id: input.emailId },
      data: {
        emailLabel: 'sent',
        subject: input.draftData.subject,
        body: input.draftData.body,
        bodySnippet: input.draftData.body.substring(0, 100),
        lastModifiedTime: new Date(),
      }
    });
    
    // Update thread status
    await ctx.db.thread.update({
      where: { id: (await ctx.db.email.findUnique({ where: { id: input.emailId } }))?.threadId },
      data: {
        draftStatus: false,
        sentStatus: true,
      }
    });
    
    return { success: true };
  })

});