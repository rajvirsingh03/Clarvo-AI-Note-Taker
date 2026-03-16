import { ImageResponse } from 'next/og'

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
          <svg
            width="18"
            height="18"
            viewBox="0 0 256 256"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M157.27 17.67a12 12 0 0 0-13.06 5.91l-80 144A12 12 0 0 0 74.7 184H124l-25.8 57.89a12 12 0 0 0 21.63 10.86l72-144A12 12 0 0 0 181.3 92H132l25.8-57.89a12 12 0 0 0-.53-16.44Z"
              fill="#6c63ff"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  )
}
