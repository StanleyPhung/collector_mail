'use client'
import { getAurinkoAuthUrl } from '@/lib/aurinko'
import React from 'react'
import { Button } from './button'

const LinkAccoutnButton = () => {
  return (
    <Button onClick = {async()=>{
        const authurl = await getAurinkoAuthUrl('Google')
        window.location.href = authurl
        console.log("Redirecting to Aurinko OAuth:", authurl);

    }}>
        Link Acount
        </Button>
  )
}

export default LinkAccoutnButton