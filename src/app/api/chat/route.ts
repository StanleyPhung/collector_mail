import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { OramaClient } from '@/lib/oramaClient';
import { getSubscriptionStatus } from '@/lib/stripe-actions';
import { db } from '@/server/db';
import { FREE_CREDITS_PER_DAY } from '@/constant';

export async function POST(req: Request) {

  const today = new Date().toDateString()
  try {
    const { userId } = await auth();
    console.log("have " , userId);
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const isSubscribed = await getSubscriptionStatus()
    if (!isSubscribed) {
      const chatbotInteraction = await db.chatbotInteraction.findFirst({
        where: {
          day: today,
          userId
        }
      })
      if(!chatbotInteraction) {
        await db.chatbotInteraction.create({
          data: {
          day: today,
          userId,
          count: 1
          }
        });
      } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
        return new Response( " You have reached free credits limits for today", { status: 429})
      }
    }

    const { accountId, messages } = await req.json();
    const orama = new OramaClient(accountId);
    await orama.initialize();

    const lastMessage = messages[messages.length - 1];
    console.log(lastMessage);

    const context = await orama.vectorSearch({ term: lastMessage.content });
    console.log(context.hits.length + ' hits found');

    // Build the system prompt using the retrieved context
    const systemPrompt = {
      role: "system",
      content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
      THE TIME NOW IS ${new Date().toLocaleString()}

      START CONTEXT BLOCK
      ${context.hits.map((hit: any) => JSON.stringify(hit.document)).join('\n')}
      END OF CONTEXT BLOCK

      When responding, please keep in mind:
      - Be helpful, clever, and articulate.
      - Rely on the provided email context to inform your responses.
      - If the context does not contain enough information to answer a question, politely say you don't have enough information.
      - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
      - Do not invent or speculate about anything that is not directly supported by the email context.
      - Keep your responses concise and relevant to the user's questions or the email being composed.`
    };

    // Prepare the chat messages (system + user messages)
    const userMessages = messages.filter((message: any) => message.role === 'user');
    const chatMessages = [systemPrompt, ...userMessages];

    // Debugging options
    console.log("Chat messages:", chatMessages);

    // Check if the payload is not null before calling streamText
    if (chatMessages) {
      // Call streamText without the removed properties.
      const result = streamText({
        model: openai('gpt-3.5-turbo'),
        messages: chatMessages,
        // Optional: use onChunk or onFinish callbacks for logging
        onChunk: async ({ chunk }) => {
          console.log("Received chunk:", chunk);
        },
        onFinish: async ({ text, finishReason }) => {
          await db.chatbotInteraction.upsert({
            where: {
              day_userId: {  // Assuming this is your compound unique constraint
                day: today,
                userId
              }
            },
            update: {
              count: {
                increment: 1
              }
            },
            create: {
              day: today,
              userId,
              count: 1
            }
          });
          console.log("Streaming finished. Final text:", text, "Finish reason:", finishReason);
        },
      });

      // Return the streaming response using the result's helper method.
      return result.toDataStreamResponse();
    } else {
      return new Response("Invalid payload", { status: 400 });
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
  return new Response("Failed to create message", { status: 500 });
  }
}