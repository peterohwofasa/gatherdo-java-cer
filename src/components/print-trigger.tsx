'use client'

import { useEffect } from 'react'

export function PrintTrigger() {
  useEffect(() => {
    window.print()
  }, [])

  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed top-4 right-4 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 shadow-md transition-colors"
    >
      Print / Save as PDF
    </button>
  )
}
