import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature") as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body, signature, process.env.STRIPE_WEBHOOK_SECRET as string
        )
    } catch (error) {
        return new Response("webhook error: ",{status:400})


    }
    const session = event.data.object as Stripe.Checkout.Session
    console.log('recieved stripe event', event.type)
    if (event.type === 'checkout.session.completed'){
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
                expand: ['items.data.price.product']

            }
        )
        if (!session?.client_reference_id){
            return new Response('Webhook Error',{status: 400})
        }
        const plan = subscription.items.data[0]?.price
        if (!plan){
            return new Response('No subscription found',{status: 400})

        }
        const productId = (plan.product as Stripe.Product).id
        if(!productId) {
            return new Response('No product found',{status: 400})
        }
        await db.stripeSubscription.create({
            data: {
                userId: session.client_reference_id,
                subscriptionId: subscription.id,
                // productId: productId,
                priceId: plan.id,
                customerId: subscription.customer as string,
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            }
        })
        return new Response('Webhook Successful 1',{status: 200});


    }
    // console.log("event: ", event)
    if (event.type === 'invoice.payment_succeeded'){
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            {
                expand: ['items.data.price.product'],
            }
        );
        const plan = subscription.items.data[0]?.price;

        if (!plan) {
            throw new Error('No plan found for this subscription.');
        }

        const productId = (plan.product as Stripe.Product).id;

        await db.stripeSubscription.update({
            where: {
                subscriptionId: subscription.id
            },
            data: {
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                productId: productId,
                priceId: plan.id,
            } 
        })
        return new Response('Webhook Successful 2',{status: 200});

    }

    if (event.type === 'customer.subscription.updated'){
        // console.log('subscription updated', session)
        const subscription = await stripe.subscriptions.retrieve(session.id as string);

        const existingSubscription = await db.stripeSubscription.findUnique({
            where: {
                subscriptionId: session.id as string
            }
        })
        if (!existingSubscription) {
            return new Response('sub not found',{status: 400})
        }

        await db.stripeSubscription.update({
            where: {
                subscriptionId: session.id as string
            },
            data: {
                updatedAt: new Date(),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            }
        })
        

        return new Response('Webhook Successful 3',{status: 200});
    }

    return NextResponse.json({ message: "success" }, { status: 200 });

}