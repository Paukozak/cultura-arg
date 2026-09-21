import { Header } from './components/Header'
import { Legend } from './features/map/Legend'
import { LayerToggle } from './features/map/LayerToggle'
import { MapInfoPanel } from './features/map/MapInfoPanel'
import { MapIntro } from './features/map/MapIntro'
import { MapIntroMobil } from './features/map/MapIntroMobil'
import { NationalMap } from './features/map/NationalMap'
import { ProvinceFullView } from './features/province-panel/ProvinceFullView'
import { ProvincePanel } from './features/province-panel/ProvincePanel'
import { altoPeekPx } from './features/province-panel/hojaLayout'
import { useMapStore } from './store/mapStore'
import { useMediaQuery } from './utils/useMediaQuery'
import { useWindowHeight } from './utils/useWindowHeight'

// Ancho de los paneles laterales de desktop (ProvincePanel y MapInfoPanel:
// `max-w-md`) — el mapa reserva este ancho a la derecha para que el panel
// (fixed, fuera del flujo) no le tape una porción, y el mismo a la izquierda
// mientras se ve MapIntro, así queda centrado en la pantalla.
const ANCHO_PANEL_PX = 448

function App() {
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const headerHeight = useMapStore((s) => s.headerHeight)
  const esMobil = useMediaQuery('(max-width: 767px)')
  // El intro a la izquierda le resta otro ancho de columna al mapa: solo entra en
  // pantallas anchas. Más angostas, el mapa se queda con el layout de antes
  // (solo el panel de la derecha).
  const hayIntro = useMediaQuery('(min-width: 1366px)')
  const alturaVentana = useWindowHeight()
  // Mismo cálculo que ProvincePanel.tsx (ver hojaLayout.ts): antes acá se
  // reservaba un `48vh` fijo, un número más grande que lo que la hoja
  // realmente asoma (48% de la ventana MENOS el header, no de la ventana
  // entera) — la diferencia quedaba como un hueco muerto entre el mapa
  // zoomeado y la hoja, con la provincia pegada arriba en vez de centrada
  // en el espacio real disponible.
  const altoHojaMobilPx = altoPeekPx(alturaVentana, headerHeight)

  return (
    // `h-dvh overflow-hidden` (no `min-h-screen` ni `h-screen`): altura
    // mínima no le pone un techo real a cuánto puede crecer el mapa, así
    // que a ventanas más bajas que anchas terminaba siendo más alto que la
    // pantalla y desbordaba con scroll. `h-screen` (100vh) tampoco alcanza
    // en mobile: el navegador mide 100vh contra el viewport MÁS GRANDE
    // posible (barra de direcciones colapsada), no contra el que en
    // realidad se ve al cargar la página (barra visible, menos alto) — el
    // contenido terminaba pensado para más alto de lo que había de verdad
    // y aparecía un scroll que no debería estar. `dvh` (dynamic viewport
    // height) sigue el alto real visible en cada momento. Con altura fija
    // de verdad, `main` tiene una altura de verdad (no solo un piso) y el
    // mapa (ver `h-full` más abajo, y en NationalMap.tsx) se ajusta para
    // entrar siempre entero, sin necesidad de scrollear nunca.
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950">
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
        // Menos padding en mobile: ahí el ancho de la pantalla es lo que
        // limita cuánto puede crecer el mapa (el viewBox es más alto que
        // ancho), así que cada px de padding lateral de menos se traduce
        // directo en un mapa más grande — sigue entrando entero en una
        // sola pantalla (`h-full`/`preserveAspectRatio` ya se encargan de
        // eso, ver los comentarios de arriba), solo que ocupa mejor el
        // espacio que tiene.
        // `overflow-hidden`: el mapa con zoom se sale de la caja de su SVG a
        // propósito (ver `overflow-visible` en NationalMap.tsx) y acá se
        // recorta contra los bordes de la pantalla y la línea del header — el
        // header (que va antes en el DOM) no queda tapado.
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1 md:p-6"
        style={
          esMobil
            ? {
                // En mobile el panel es una hoja inferior (ver
                // ProvincePanel.tsx), no un panel lateral — correr el mapa
                // hacia la izquierda no tiene sentido acá; se lo corre
                // hacia arriba para que el área visible por encima de la
                // hoja sea donde el mapa se termina centrando.
                paddingBottom: provinciaSeleccionada
                  ? altoHojaMobilPx
                  : undefined,
                transition: 'padding-bottom 300ms ease',
              }
            : {
                // Siempre hay un panel a la derecha en desktop: el de la
                // provincia elegida o, sin ninguna, el de información de
                // la capa (MapInfoPanel).
                paddingRight: ANCHO_PANEL_PX + 24,
                // Espejo del intro: mientras se ve, reserva su lugar para
                // centrar el mapa; con una provincia elegida el intro se
                // retira y el mapa recupera ese espacio para el zoom.
                paddingLeft:
                  hayIntro && !provinciaSeleccionada
                    ? ANCHO_PANEL_PX + 24
                    : undefined,
                transition: 'padding 300ms ease',
              }
        }
      >
        {/* Con una provincia seleccionada, Densidad/Total y la leyenda ya
            no aportan nada (el foco pasa a esa provincia puntual, no a
            comparar todo el país) y en mobile además tapan parte del poco
            área de mapa que queda visible sobre la hoja inferior. */}
        {esMobil ? (
          // Mobile: fila propia arriba (no flotando ENCIMA del mapa) y el
          // mapa ocupa lo que queda debajo (`min-h-0 flex-1`) — apilados,
          // no superpuestos como en desktop.
          <div className="flex h-full w-full max-w-3xl flex-col">
            {!provinciaSeleccionada && (
              <div className="flex shrink-0 items-start justify-between gap-2 px-2 pb-2 pt-2">
                <LayerToggle />
                <Legend />
              </div>
            )}
            <div className="relative min-h-0 flex-1 pb-3">
              <NationalMap />
            </div>
          </div>
        ) : (
          // Desktop: el mapa solo; el toggle de capa y toda la información
          // (escala + ranking) viven en `MapInfoPanel`, un panel lateral
          // fijo — no controles flotando sobre el mapa ni una leyenda
          // detrás de un botón.
          <div className="relative h-full w-full max-w-3xl">
            <NationalMap />
          </div>
        )}
      </main>
      {!esMobil && <MapInfoPanel />}
      {!esMobil && hayIntro && <MapIntro />}
      {/* Mobile: pantalla de bienvenida, una sola vez por dispositivo. */}
      {esMobil && <MapIntroMobil />}
      <ProvincePanel />
      <ProvinceFullView />
    </div>
  )
}

export default App
