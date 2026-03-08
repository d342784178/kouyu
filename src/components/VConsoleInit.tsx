'use client'

import { useEffect } from 'react'

export function VConsoleInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (process.env.NEXT_PUBLIC_ENABLE_VCONSOLE === 'true') {
        import('vconsole').then((VConsole) => {
          new VConsole.default()
        })
      }
    }
  }, [])
  
  return null
}
