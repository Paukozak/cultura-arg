import { Header } from './components/Header'
import { Legend } from './features/map/Legend'
import { LayerToggle } from './features/map/LayerToggle'
import { NationalMap } from './features/map/NationalMap'
import { ProvinceFullView } from './features/province-panel/ProvinceFullView'
import { ProvincePanel } from './features/province-panel/ProvincePanel'
import { useMapStore } from './store/mapStore'

// Ancho del panel lateral (ProvincePanel: `max-w-md`) — con una provincia
// seleccionada, el mapa se corre este mismo ancho hacia la izquierda para
// que el panel (fixed, fuera del flujo) no le tape una porción a la derecha.
const ANCHO_PANEL_PX = 448

function App() {
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)

  return (
    // `h-screen overflow-hidden` (no `min-h-screen`): con altura mínima
    // nada le pone un techo real a cuánto puede crecer el mapa, así que a
    // ventanas más bajas que anchas terminaba siendo más alto que la
    // pantalla y desbordaba con scroll — con la página scrolleada, todo el
    // cálculo de centrado (acá y en NationalMap.tsx) pierde sentido: ya no
    // hay una relación fija entre "centro de `main`" y "centro real de la
    // ventana". Con altura fija, `main` tiene una altura de verdad (no solo
    // un piso) y el mapa (ver `h-full` más abajo, y en NationalMap.tsx) se
    // ajusta para entrar siempre entero, sin necesidad de scrollear nunca.
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-950">
      <Header />
      {/* `min-h-0`: un item flex no se achica por debajo del tamaño
          "natural" de su contenido a menos que se lo digas explícitamente
          (el default es `min-height: auto`, no `0`). Sin esto, `flex-1` no
          alcanzaba para limitar la altura de `main` — el mapa (que deriva
          su alto de su ancho vía el aspect-ratio del viewBox) empujaba a
          `main` a crecer más allá del alto disponible igual, desbordando
          el `h-screen` de arriba en silencio (recortado por su
          `overflow-hidden`, no visible como scroll, pero rompiendo todo el
          cálculo de centrado que asume que `main` mide justo lo disponible). */}
      <main
        className="flex min-h-0 flex-1 items-center justify-center p-6"
        style={{
          paddingRight: provinciaSeleccionada ? ANCHO_PANEL_PX + 24 : undefined,
          transition: 'padding-right 300ms ease',
        }}
      >
        <div className="relative h-full w-full max-w-3xl">
          {/* Corridos un poco por afuera del borde del mapa (no pegados a
              la esquina): con una provincia grande zoomeada, su forma llega
              hasta casi los bordes del SVG y, pegados a la esquina, estos
              controles se leían como parte del mapa en vez de como su
              propio elemento de interfaz flotando por encima. Quedan fijos
              en su lugar sin importar el zoom (ver NationalMap.tsx para la
              corrección de centrado vertical, que solo mueve el mapa). */}
          <div className="absolute -left-2 -top-3 z-10 sm:-left-3 sm:-top-4">
            <LayerToggle />
          </div>
          <div className="absolute -right-2 -top-3 z-10 sm:-right-3 sm:-top-4">
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
