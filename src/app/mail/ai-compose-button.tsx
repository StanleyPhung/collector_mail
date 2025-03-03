'use client'

import React from 'react'
import { turndown } from '@/lib/turndown'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateEmail } from './action'
import { readStreamableValue} from 'ai/rsc'
import useThreads from '@/hooks/use-threads'
  

type Props = {
    isComposing?: boolean,
    onGenerate: (token:string) => void
}

const AiComposeButton = (props: Props) => {
    const [open, setOpen] = React.useState(false)
    const [prompt, setPrompt] = React.useState('')
    const {threads, threadId, account} = useThreads()
    const thread = threads?.find(t => t.id === threadId)
  
    const aiGenerate = async (prompt: string) => {

        let context = ''

        if(!props.isComposing){
            for (const email of thread?.emails ?? []){
                const content = `
                Subject: ${email.subject}
                From: ${email.from}
                Sent: ${ new Date(email.sentAt).toLocaleString()}
                Body: ${turndown.turndown(email.body ?? email.bodySnippet ?? "")}
                `
                context += content
            }
        }
        context += `
        My name is ${account?.name} and my email is ${account?.emailAddress}.
        `

        console.log(context)

        const { output } = await generateEmail(context, prompt)

        //   console.log('Generated email stream:', output)
    
        // Iterate over the tokens as they are updated
        for await (const token of readStreamableValue(output)) {
            if (token) {
            console.log('Generated token:', token)
            props.onGenerate(token)
            }
        }
    }


  return (
    <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger>
        <Button size='icon' variant={'outline'} onClick={() => setOpen(true)}>
            <Bot className=" size-5"/>
        </Button>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader>
        <DialogTitle>AI Smart Compose</DialogTitle>
        <DialogDescription>
            AI will help you compose your mail, please write a prompt to start!
        </DialogDescription>
        <div className="h-2"></div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}  placeholder='Enter a prompt here'/>
        <div className="h-2"></div>
        <Button onClick={() => {  
            setOpen(false)
            setPrompt('')
            aiGenerate(prompt)
        }}>
        Generate
        </Button>
        </DialogHeader>
    </DialogContent>
    </Dialog>

  )
}

export default AiComposeButton
