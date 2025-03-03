'use client'

import { FREE_CREDITS_PER_DAY } from '@/constant'
import React from 'react'
import StripeButton from './stripe-button'
import { getSubscriptionStatus } from '@/lib/stripe-actions'
import { api } from '@/trpc/react'
import useThreads from '@/hooks/use-threads'

const PremiumBanner = () => {
    const [isSubscribed, setIsSubscribed] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)
    const [fadeState, setFadeState] = React.useState('in') // 'in' or 'out'
    const {accountId} = useThreads()
    const {data} = api.account.getChatbotInteraction.useQuery({
        accountId
    })

    React.useEffect(() => {
        const checkSubscription = async () => {
            try {
                setIsLoading(true)
                
                // Fade out before changing state
                setFadeState('out')
                
                // Wait for fade out to complete
                setTimeout(async () => {
                    const subscriptionStatus = await getSubscriptionStatus()
                    setIsSubscribed(subscriptionStatus)
                    // console.log("is here",isSubscribed)
                    setIsLoading(false)
                    
                    // Fade back in with the new state
                    setTimeout(() => {
                        setFadeState('in')
                    }, 50)
                }, 1000)
                
            } catch (error) {
                console.error('Error fetching subscription status:', error)
                setFadeState('out')
                
                setTimeout(() => {
                    setIsLoading(false)
                    
                    setTimeout(() => {
                        setFadeState('in')
                    }, 50)
                }, 200)
            }
        }
        
        checkSubscription()
    }, [])

    // Apply animation class
    const animationClass = `transition-opacity duration-200 ${fadeState === 'in' ? 'opacity-100' : 'opacity-0'}`

    // Loading state
    if (isLoading) return (

        <div className={animationClass}>
            <div className='bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4'>
                <div className='flex-1 md:min-w-[200px] flex justify-center items-center'>
                    <img 
                        src='/loading.gif' 
                        className='h-[200px] w-auto object-contain mix-blend-screen items-center'
                        alt="Loading"
                    />
                </div>
            </div>
        </div>
    )

    // Not subscribed state
    if (!isSubscribed) return (
        <div className={animationClass}>
            <div className='bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4'>
                <div className='md:absolute md:-bottom-6 md:-right-10 h-[180px] w-auto'>
                    <img 
                        src='/bot.gif' 
                        className='h-full w-auto object-contain mix-blend-screen'
                        alt="AI Chat Bot"
                    />
                </div>
                <div>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-white text-xl font-bold'>Basic Plan</h1>
                        <p className='text-gray-400 text-sm md:max-w-full'>
                            {data?.remainingCredits} / {FREE_CREDITS_PER_DAY} messages remaining
                        </p>
                    </div>
                    <div className='h-4'></div>
                    <p className='text-gray-400 text-sm md:max-w-[calc(100% - 150px)]'>
                        Upgrade to pro to ask unlimited questions
                    </p>
                    <div className='h-4'></div>
                    <StripeButton />
                </div>
            </div>
        </div>
    )

    // Subscribed state
    if (isSubscribed) return (
        <div className={animationClass}>
            
            <div className='bg-gray-900 relative p-4 rounded-lg border overflow-hidden flex flex-col md:flex-row gap-4'>
                <div className='md:absolute md:-bottom-6 md:-right-10 h-[180px] w-auto'>
                    <img 
                        src='/pro.gif' 
                        className='h-full w-auto object-contain mix-blend-screen'
                        alt="AI Chat Bot"
                        />
                </div>
                <div>
                    <div className='flex items-center gap-2'>
                        <h1 className='text-white text-xl font-bold'>Premium Plan Active</h1>
                    </div>
                    <div className='h-4'></div>
                    <p className='text-gray-400 text-sm md:max-w-[calc(100% - 70px)]'>
                        Ask some questions to start, it's unlimited
                    </p>
                    <div className='h-4'></div>
                    <StripeButton />
                </div>
            </div>
        </div>
    )

    // Default fallback (should not be reached)
    // Default fallback (should not be reached)
    return (
        <div className={animationClass}>
            PremiumBanner
        </div>
    )
}

export default PremiumBanner