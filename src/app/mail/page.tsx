"use client";

import ThemeToggle from '@/components/theme-toggle';
import { UserButton } from '@clerk/nextjs';
import dynamic from 'next/dynamic'
import React from 'react'
import { SpeedInsights } from "@vercel/speed-insights/next"

const ComposeButton = dynamic(() => {
  return import('./compose-button')
}, {
  ssr: false
})

// import Mail from './mail'
// code splitting: is a technique used to break your JavaScript code into smaller chunks or bundles.
// Instead of loading your entire application at once, you load only what’s necessary for the current page or component.
// This helps improve performance and reduce the initial load time of your application.
const Mail = dynamic(() => {
  return import('./mail')
}, {
  ssr: false
})

const MailDashboard = () => {
  return (
    <>
      <div className='absolute bottom-4 left -4'>
        <div className="flex items-center gap-2">

          <UserButton />
          <ThemeToggle/>
          <ComposeButton/>
        </div>
      </div>
      <Mail
        defaultLayout={[20,32,40]}
        defaultCollapsed={false}
        navCollapsedSize={50}
      />
    </>
    
  )
}

export default MailDashboard