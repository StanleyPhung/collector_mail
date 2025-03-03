'use client'

import { Button } from '@/components/ui/button'
import { addDays, addHours, format, nextSaturday } from "date-fns"
import { Separator } from '@/components/ui/separator'
import useThreads from '@/hooks/use-threads'
import { Archive, ArchiveX, Clock3, MoreVertical, Trash2Icon } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import EmailDisplay from './email-display'
import ReplyBox from './reply-box'
import { useAtom } from 'jotai'
import SearchBar, { isSearchingAtom, searchValueAtom } from './search-bar'
import SearchDisplay from './search-display'
import { draftExpandedAtom } from '@/atoms/editor-state'
  
const ThreadDisplay = () => {
    const [isSearching] = useAtom(isSearchingAtom)
    const [draftExpanded] = useAtom(draftExpandedAtom) // Get draft expanded state
    const {threadId, threads} = useThreads()
    const thread = threads?.find(t => t.id === threadId)
    
    // Set the CSS variable based on draft expanded state with a slight delay
    useEffect(() => {
        // Start the transition by adding a CSS class
        document.documentElement.classList.add('transitioning');
        
        // Update the CSS variable
        document.documentElement.style.setProperty(
            '--reply-box-height', 
            draftExpanded ? '-50px' : '80px'
        );
    }, [draftExpanded])
    
    return (
        <div className='flex flex-col h-full'>
            {/* Buttons row */}
            <div className='flex items-center p-2'>
                <div className='flex items-center gap-2'>
                    <Button variant={'ghost'} size='icon' disabled={!threads}>
                        <Archive className='size-4'/>
                    </Button>
                    <Button variant={'ghost'} size='icon' disabled={!threads}>
                        <ArchiveX className='size-4'/>
                    </Button>
                    <Button variant={'ghost'} size='icon' disabled={!threads}>
                        <Trash2Icon className='size-4'/>
                    </Button>
                </div>
                <Separator orientation='vertical' className='ml-2'/>
                <Button className='ml-2' variant={'ghost'} size='icon' disabled={!threads}>
                    <Clock3 className='size-4'/>
                </Button>

                <div className=' flex items-center ml-auto'>
                    <DropdownMenu>
                        <DropdownMenuTrigger>
                            <Button className='ml-2' variant={'ghost'} size='icon' disabled={!threads}>
                                <MoreVertical className='size-4'/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align = 'end'>
                            <DropdownMenuItem>Mark as thread</DropdownMenuItem>
                            <DropdownMenuItem>Star thread</DropdownMenuItem>
                            <DropdownMenuItem>Add Label</DropdownMenuItem>
                            <DropdownMenuItem>Mute thread</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Separator/>
        
            {isSearching ? <SearchDisplay/> : (
                <>
                    {thread ? (
                        <>
                            <div className='flex flex-col flex-1 overflow-scroll'>
                                <div className='flex items-start p-4'>
                                    <div className='flex items-center gap-4 text-sm'>
                                        <Avatar>
                                            <AvatarImage alt='avatar'/>
                                            <AvatarFallback>
                                                {thread.emails[0]?.from?.name?.split(' ').map(chunk=>chunk[0]).join('')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className='grid gap-1'>
                                            <div className='font-semibold'>
                                                {thread.emails[0]?.from.name}
                                                <div className='text-xs line-clamp-1'>
                                                    {thread.emails[0]?.subject}
                                                </div>
                                                <div className='text-xs line-clamp-1'>
                                                    <span className="font-medium">
                                                    Reply-To:
                                                    </span>
                                                    {thread.emails[0]?.from?.address}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {thread.emails[0]?.sentAt && (
                                        <div className='ml-auto text-xs text-muted-foreground'>
                                            {format(new Date(thread.emails[0]?.sentAt), 'PPpp')}
                                        </div>
                                    )}
                                </div>

                                <Separator/>
                                {/* This is the container that will animate with the CSS variable */}
                                <div className="email-container transition-max-height overflow-scroll flex flex-col">
                                    <div className="p-6 flex flex-col gap-4">
                                        {thread.emails.map(email => {
                                            return <EmailDisplay email={email} key={email.id} />
                                        })}
                                    </div>
                                </div>
                                <div className='flex-1 flex'> </div>
                                <Separator className='mt-auto'/>
                                <ReplyBox/>
                            </div>
                        </>) : (
                        <>
                            <div className='p-8 text-center text-muted-foreground'>
                                No messages Selected
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default ThreadDisplay