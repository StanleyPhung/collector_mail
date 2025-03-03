'use client'

import { Input } from '@/components/ui/input'
import useThreads from '@/hooks/use-threads'
import { atom, useAtom } from 'jotai'
import { Loader2, Search, X } from 'lucide-react'
import React from 'react'

export const searchValueAtom = atom('')

export const isSearchingAtom = atom(false)

const SearchBar = () => {
  
    const [searchValue, setSearchValue] = useAtom(searchValueAtom)
    const [isSearching, setIsSearching] = useAtom(isSearchingAtom)

    const {isFetching} = useThreads()

    const handleBlur = () => {
        if(searchValue !== "") return
        setIsSearching(false)

    }

    return (
        <div className="relative m-4">
            <Search className='absolute left-2 top-2.5 size-4 text-muted-foreground' />
            <Input 
            placeholder='Search...'
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className='w-full px-7 py-2 text-sm rounded-md bg-transparent'
            onFocus={()=> setIsSearching(true)}
            onBlur={()=> handleBlur()}
            
            />
            <div className='absolute right-2 top-2.5 flex items-center gap-2'>
                {isFetching && <Loader2 className='text-gray-400 size-4 animate-spin'>Loading...</Loader2>}
                <button className=' rounded-sm hover:bg-gray-400/20 '
                onClick={() => {
                    setSearchValue('')
                    setIsSearching(false)
                }}
                >
                    <X className='text-gray-400 size-4'/>
                </button>

            </div>
        </div>
    )

}

export default SearchBar