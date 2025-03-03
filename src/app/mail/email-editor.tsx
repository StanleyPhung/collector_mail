'use client'

import React from 'react'
import {EditorContent, useEditor} from '@tiptap/react'
import { Text } from '@tiptap/extension-text'
import StarterKit  from "@tiptap/starter-kit";
import EditorMenuBar from './editor-menubar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import TagInput from './tag-input';
import { Input } from '@/components/ui/input';
import AiComposeButton from './ai-compose-button';
import { generate } from './action';
import { readStreamableValue } from 'ai/rsc';
import { useAtom } from 'jotai';
import { draftExpandedAtom } from '@/atoms/editor-state';

type Props = {
    subject: string
    setSubject: (value: string) => void

    toValues: { label: string, value: string}[]
    setToValues: (values: {'label': string,value: string}[]) => void

    ccToValues: { label: string, value: string}[]
    setCcValues: (values: {'label': string,value: string}[]) => void

    to:string[]

    handleSend: (value: string) => void
    isSending: boolean

    defaultToolbarExpanded?: boolean
}

const EmailEditor = ({subject, setSubject, ccToValues, to, handleSend, isSending, defaultToolbarExpanded, setCcValues, setToValues,toValues}: Props) => {
    const [value, setValue] = React.useState('');
    // Use the atom instead of local state
    const [expanded, setExpanded] = useAtom(draftExpandedAtom);
    const [token, setToken] = React.useState<String>('')

    // Initialize with default value if provided
    React.useEffect(() => {
        if (defaultToolbarExpanded !== undefined) {
            setExpanded(defaultToolbarExpanded);
        }
    }, [defaultToolbarExpanded, setExpanded]);

    const aiGenerate = async(string: string) => {
        console.log('ai_generate');
        const {output} = await generate(string)
        console.log('Generated token:', output)
        for await (const token of readStreamableValue(output)) {
            if (token) {
                setToken(token)
            }
        }
    }
  
    const CustomText = Text.extend({
        addKeyboardShortcuts() {
        return {
            'Mod-j': () => {
            console.log('Mod-j pressed');
            aiGenerate(this.editor.getText())
            return true;
            }
        }
        }
    });
    
    const editor = useEditor({
        autofocus: false,
        extensions: [StarterKit, CustomText],
        onUpdate: ({ editor }) => {
        setValue(editor.getHTML());
        }
    });

    React.useEffect(() => {
        if (!token || !editor) return;
        editor?.commands?.insertContent(token)
    },[editor,token])


    const setGenerate = (token:string) => {
        editor?.commands?.insertContent(token)
    }

    if(!editor) return null;


    return (
        <div>
            <div className='p-2 flex py-3 border-b'>
            <EditorMenuBar editor={editor}/>
            </div>

            <div className='p-4 pb-0 space-y-2'>
                {expanded && (
                    <>
                        <TagInput
                        label='To'
                        onChange={setToValues}
                        placeholder= 'Add Recepients'
                        value={toValues}
                        />
                        <TagInput
                        label='Cc'
                        onChange={setCcValues}
                        placeholder= 'Add Recepients'
                        value={ccToValues}
                        />
                        <Input id='subject' placeholder='Subject' value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </>
                )}

                <div className='flex items-centeer gap-2'>
                    <div className='cursor-pointer' onClick={()=> setExpanded(!expanded)}>
                        <span className='text-green-600 font-medium'>
                            Draft {" "}
                        </span>
                        <span>
                            to {to.join(', ')}
                        </span>
                    </div>
                    <AiComposeButton isComposing={expanded} onGenerate={setGenerate} />
                </div>
            </div>

            <div className = 'prose w-full px-4 py-5 max-h-[13vh] overflow-y-auto'>
                <EditorContent editor={editor} value={value}/>
            </div>

            <Separator/>

            <div className='py-3 px-4 flex items-center justify-between'>
                <span className='text-sm'>
                    Tip: Press {" "}
                    <kbd className='px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg' >
                        Cmd + J
                    </kbd> {" "}
                    for AI autocomplete
                </span>
                <Button onClick={ async() => {
                    editor?.commands?.clearContent()
                    await handleSend(value)
                }}disabled={isSending}>
                    Send
                </Button>
            </div>
        </div>
    )
}

export default EmailEditor