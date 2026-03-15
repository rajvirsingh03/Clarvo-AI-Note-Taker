import { ImageResponse } from 'next/og'
import { Lightning } from '@phosphor-icons/react'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#0a0a0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(108,99,255,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Lightning size={18} weight="fill" color="#6c63ff" />
        </div>
      </div>
    ),
    { ...size }
  )
}
