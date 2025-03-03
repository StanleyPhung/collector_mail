'use client'

import { useAtom } from 'jotai'
import React from 'react'
import { searchValueAtom } from './search-bar'
import { api } from '@/trpc/react'
import { useDebounceValue } from 'usehooks-ts'
import useThreads from '@/hooks/use-threads'
import { toast } from 'sonner'
import DOMPurify from 'dompurify';


const SearchDisplay = () => {

    const [searchValue, setIsSearching] = useAtom(searchValueAtom)
    const [debounceSearch] = useDebounceValue(searchValue,1000)

    const search = api.account.searchEmail.useMutation()
    const {accountId, setThreadId} = useThreads()

    React.useEffect(() =>  {
        if(!debounceSearch || !accountId) return
        search.mutate({
            account: accountId,
            query: debounceSearch
        })
        console.log('searching for...',debounceSearch)
    },[debounceSearch,accountId])


  return (
    
    <div className='p-4 max-h-[calc(100vh-50px)] overflow-y-scroll'>
        <div className='flex items-center gap-4 mb-4'>
            <h2 className='text-gray-600 text-sm dark:text-gray-300'>
                Search Results for "{searchValue}"
            </h2>

        
        </div>
        {search.data?.hits.length === 0 ? (<><p>
            No results found</p></>) : <>
            <ul className='flex flex-col gap-2'>
                {search.data?.hits.map((hit) => (
                            <li onClick={() => {
                                if (!hit.document.threadId) { toast.error("This message is not part of a thread"); return }
                                setThreadId(hit.document.threadId)
                            }} key={hit.id} className="border list-none rounded-md p-4 hover:bg-gray-100 cursor-pointer transition-all dark:hover:bg-gray-900">
                                <h3 className="text-base font-medium">{hit.document.title}</h3>
                                <p className="text-sm text-gray-500">
                                    From: {hit.document.from}
                                </p>
                                <p className="text-sm text-gray-500">
                                    To: {hit.document.to.join(", ")}
                                </p>
                                <p className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hit.document.body, { USE_PROFILES: { html: true } }) }}/>
                            </li>
                ))}
            </ul>
            </>}
    </div>
  )
}

export default SearchDisplay