import { Header } from './components/Header'
import { Legend } from './features/map/Legend'
import { LayerToggle } from './features/map/LayerToggle'
import { NationalMap } from './features/map/NationalMap'
import { ProvinceFullView } from './features/province-panel/ProvinceFullView'
import { ProvincePanel } from './features/province-panel/ProvincePanel'

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <Header />
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="relative w-full max-w-3xl">
          <div className="absolute left-0 top-0 z-10">
            <LayerToggle />
          </div>
          <div className="absolute right-0 top-0 z-10">
            <Legend />
          </div>
          <NationalMap />
        </div>
      </main>
      <ProvincePanel />
      <ProvinceFullView />
    </div>
  )
}

export default App
