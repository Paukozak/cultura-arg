import { Header } from './components/Header'
import { NationalMap } from './features/map/NationalMap'

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <NationalMap />
        </div>
      </main>
    </div>
  )
}

export default App
