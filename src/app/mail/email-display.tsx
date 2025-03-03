'use client'

import {Letter} from 'react-letter'
import useThreads from '@/hooks/use-threads'
import { cn } from '@/lib/utils'
import { RouterOutputs } from '@/trpc/react'
import Avatar from 'react-avatar'
import React from 'react'
import { formatDistanceToNow } from 'date-fns'

type Props = {
    email: RouterOutputs['account']['getThreads'][0]['emails'][0]
}

const EmailDisplay = ({email}: Props) => {
    const {account} = useThreads()
    const IsMe = account?.emailAddress === email.from.address

    return (
        <div className={
            cn('border rounded-md p-4 transition-all hover:translate-x-2 w-full', {
                'border-l-gray-900 border-l-4': IsMe
            })
        }>
            <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2'>
                    {!IsMe && <Avatar name={email.from.name ?? email.from.address} email={email.from.address} size='35' textSizeRatio={2} round={true} />}
                    <span className='font-medium'>
                        {IsMe ? 'Me': email.from.address}
                    </span>
                </div>
                <p className='text-xs text-muted-foreground'>
                    {formatDistanceToNow(email.sentAt ?? new Date(), {
                        addSuffix: true
                    })}
                </p>
            </div>
            <div className="h-4"></div>
            <div className="max-w-full overflow-x-auto">
                <Letter html={email?.body ?? ''} className='bg-white rounded-md text-black w-full dark:bg-black dark:text-gray-400' />
            </div>
        </div>
    )
}

export default EmailDisplay