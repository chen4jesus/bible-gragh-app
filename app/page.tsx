import { BibleGraph } from './components/BibleGraph'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full h-screen">
        <BibleGraph />
      </div>
    </main>
  )
} 