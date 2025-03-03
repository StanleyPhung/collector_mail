'use client'

import React from 'react'
import EmailEditor from './email-editor'
import { api, RouterOutputs } from '@/trpc/react'
import useThreads from '@/hooks/use-threads'
import { toast } from 'sonner'
import { draftExpandedAtom } from '@/atoms/editor-state'
import { useAtom } from 'jotai'

const ReplyBox = () => {
  const { threadId, accountId } = useThreads()
  const [draftExpanded] = useAtom(draftExpandedAtom)

  const { data: replyDetails } = api.account.getReplyDetails.useQuery({
    threadId: threadId ?? "",
    accountId,
  })

  if (!replyDetails) return null

  return (
    // The container transitions between a small (e.g. 40px) and larger (e.g. 130px) height.
    <div 
      className="transition-all duration-300 ease-in-out bg-card p-2 border-t"
    //   style={{ height: draftExpanded ? '100px' : '-300px' }}
    >
      <Component replyDetails={replyDetails} />
    </div>
  )
}

const Component = ({ replyDetails }: { replyDetails: RouterOutputs['account']['getReplyDetails'] }) => {
  const { threadId, accountId } = useThreads()

  const [subject, setSubject] = React.useState(
    replyDetails.subject.startsWith("Re: ") ? replyDetails.subject : `Re: ${replyDetails.subject}`
  )
  const [toValues, setToValues] = React.useState<{ label: string, value: string }[]>(
    replyDetails.to.map(to => ({ label: to.address ?? to.name, value: to.address })) || []
  )
  const [ccValues, setCcValues] = React.useState<{ label: string, value: string }[]>(
    replyDetails.cc.map(cc => ({ label: cc.address ?? cc.name, value: cc.address })) || []
  )

  React.useEffect(() => {
    if (!threadId || !replyDetails) return

    if (!replyDetails.subject.startsWith("Re: ")) {
      setSubject(`Re: ${replyDetails.subject}`)
    } else {
      setSubject(replyDetails.subject)
    }

    setToValues(replyDetails.to.map(to => ({ label: to.address, value: to.address })))
    setCcValues(replyDetails.cc.map(cc => ({ label: cc.address, value: cc.address })))
  }, [threadId, replyDetails])

  const sendEmail = api.account.sendEmail.useMutation()

  const handleSend = async (value: string) => {
    if (!replyDetails) return

    sendEmail.mutate({
      accountId,
      threadId: threadId ?? undefined,
      body: value,
      subject,
      to: replyDetails.to.map(to => ({ address: to.address, name: to.name ?? "" })),
      cc: replyDetails.cc.map(cc => ({ address: cc.address, name: cc.name ?? "" })),
      from: replyDetails.from,
      replyTo: replyDetails.from,
      inReplyTo: replyDetails.id,
    }, {
      onSuccess: () => {
        toast.success("Email sent successfully")
        console.log("Email sent successfully")
      },
      onError: (error) => {
        toast.error("Error sending email:")
        console.error(error)
      }
    })
  }

  return (
    <EmailEditor
      subject={subject}
      setSubject={setSubject}
      toValues={toValues}
      ccToValues={ccValues}
      setToValues={setToValues}
      setCcValues={setCcValues}
      to={replyDetails.to.map(to => to.address)}
      handleSend={handleSend}
      isSending={sendEmail.isPending}
    />
  )
}

export default ReplyBox
