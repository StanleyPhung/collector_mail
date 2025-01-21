import { db } from "@/server/db"
import { ok } from "assert"

export const POST = async(req:Request) => {
    const {data} =  await req.json()
    console.log("clerk webhook received ", data)
    const emailAddress = data.email_addresses[0].email_address
    const firstName = data.first_name
    const LastName = data.last_name
    const imageUrl = data.image_url
    const id = data.id

    const existingUser = await db.user.findUnique({
        where: { id },
      });
  
      if (existingUser) {
        console.log(`User with id ${id} already exists. Skipping creation.`);
        return new Response("User already exists", { status: 200 });
      }
  
      // Create the new user
      await db.user.create({
        data: {
          id,
          emailAddress,
          firstName,
          LastName,
          imageUrl,
        },
      });

    return new Response('webhook received', {status: 200})
}