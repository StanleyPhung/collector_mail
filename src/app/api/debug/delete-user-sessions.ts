import { Clerk } from "@clerk/nextjs/server";

export const POST = async (req: Request) => {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response("User ID is required.", { status: 400 });
    }

    // Initialize the Clerk client
    const clerkClient = Clerk();

    // Revoke all sessions for the specified user
    await clerkClient.sessions.revokeSessionsForUser(userId);
    console.log(`All sessions for user ${userId} deleted.`);

    return new Response(`All sessions for user ${userId} have been deleted.`, {
      status: 200,
    });
  } catch (error) {
    console.error("Error deleting user sessions:", error);
    return new Response("Failed to delete user sessions.", { status: 500 });
  }
};
