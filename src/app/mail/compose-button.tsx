'use client'

import { Button } from "@/components/ui/button"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"

import React from 'react'
import { api } from "@/trpc/react"
import { useLocalStorage } from "usehooks-ts"
import { Pencil } from "lucide-react"
import EmailEditor from "./email-editor"
import useThreads from "@/hooks/use-threads"
import { toast } from "sonner"


type Props = {}

const ComposeButton = (props: Props) => {

    const [open, setOpen] = React.useState(false)
    const [accountId] = useLocalStorage('accountId', '')
    const [toValues, setToValues] = React.useState<{ label: string; value: string; }[]>([])
    const [ccValues, setCcValues] = React.useState<{ label: string; value: string; }[]>([])
    const [subject, setSubject] = React.useState<string>('')
    
    const { account } = useThreads()
    const sendEmail = api.account.sendEmail.useMutation()


    const handleSend = async (value: string) => {
        console.log(account)
        console.log({ value })
        if (!account) return
        sendEmail.mutate({
            accountId,
            threadId: undefined,
            body: value,
            subject,
            from: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            to: toValues.map(to => ({ name: to.value, address: to.value })),
            cc: ccValues.map(cc => ({ name: cc.value, address: cc.value })),
            replyTo: { name: account?.name ?? 'Me', address: account?.emailAddress ?? 'me@example.com' },
            inReplyTo: undefined,
        }, {
            onSuccess: () => {
                toast.success("Email sent")
                setOpen(false)
            },
            onError: (error) => {
                console.log(error)
                toast.error(error.message)
            }
        })
    }

  return (
    <Drawer>
        <DrawerTrigger asChild>
            <Button>
                <Pencil className="size-4 mr-1"/>
                Compose</Button>
        </DrawerTrigger>
            <DrawerContent>
                    <DrawerHeader>
                <DrawerTitle>Compose Email</DrawerTitle>
                    </DrawerHeader>
                    <EmailEditor
                    subject={subject}
                    setSubject={setSubject}
            
                    toValues={toValues}
                    ccToValues={ccValues}
                    setToValues={setToValues}
                    setCcValues={setCcValues}
                    to={toValues.map(to => to.value)}
                    handleSend={handleSend}
                    isSending={sendEmail.isPending}
                    defaultToolbarExpanded={true}
                    />
            </DrawerContent>
</Drawer>

  )
}

export default ComposeButton