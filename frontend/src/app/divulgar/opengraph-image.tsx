import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#f3f6f4',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          color: '#0a192f',
        }}
      >
        <div style={{ fontSize: 72 }}>Publique o seu link.</div>
        <div style={{ fontSize: 36, marginTop: 24 }}>Publicar é grátis. A análise é humana.</div>
      </div>
    ),
    { ...size },
  )
}
