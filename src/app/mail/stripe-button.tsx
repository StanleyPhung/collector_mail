'use client'

import { Button } from '@/components/ui/button'
import { createBillingPortalSession, createCheckoutSession, getSubscriptionStatus } from '@/lib/stripe-actions'
import React from 'react'

const StripeButton = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)


    React.useEffect(() => {
        (async () => {
            const subscriptionStatus = await getSubscriptionStatus()
            // console.log("subscription here", subscriptionStatus)
            setIsSubscribed(subscriptionStatus)
        })()
    }, [])

    const handleClick = async () => {
        // console.log("sub here", isSubscribed)
        if(isSubscribed){
            await createBillingPortalSession()
        }else {
            await createCheckoutSession()
        }
    }

  return (
    <Button variant={'outline'} size='lg' onClick={handleClick}>
        {isSubscribed ? 'Manage Subscription' : 'Upgrade to Pro'}
    </Button>
  )
}

export default StripeButton