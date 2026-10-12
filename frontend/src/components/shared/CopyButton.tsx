'use client'

import React, { useState } from 'react'

interface CopyButtonProps {
  text: string
  className?: string
  iconClassName?: string
  onCopy?: () => void
}

export function CopyButton({ text, className = '', iconClassName = 'w-4 h-4', onCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (onCopy) onCopy()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`text-gray-400 hover:text-gray-600 transition-colors relative ${className}`}
      title={copied ? 'Copied' : 'Copy'}
    >
      <svg
        className={iconClassName}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      {copied && (
        <span 
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs whitespace-nowrap pointer-events-none z-50"
          style={{
            backgroundColor: 'rgba(55, 65, 81, 0.95)',
            fontSize: '11px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '4px',
            padding: '4px 8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
            lineHeight: '1.4'
          }}
        >
          Copied
        </span>
      )}
    </button>
  )
}
