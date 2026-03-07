'use client'

import { useEffect } from 'react'

export function VConsoleInit() {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      import('vconsole').then((VConsole) => {
        new VConsole.default()
      })
    }
  }, [])
  
  return null
}
