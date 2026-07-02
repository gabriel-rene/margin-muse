import { type MetadataRoute } from 'next'

// Served at /manifest.webmanifest and linked automatically by Next. This is
// what makes browsers offer "Install app" / "Add to Dock", giving Margin Muse
// a taskbar/dock icon and its own chromeless window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Margin Muse',
    short_name: 'Muse',
    description: 'A writing editor where AI augments thinking.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0ead8',
    theme_color: '#f0ead8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
