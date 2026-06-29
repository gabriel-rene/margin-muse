import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'

export default function Home() {
  return (
    <main className="flex min-h-screen gap-8 px-8 py-12 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <Editor />
      </div>
      <MarginRail />
    </main>
  )
}
