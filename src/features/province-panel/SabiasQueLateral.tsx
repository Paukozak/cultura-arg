import { useMapStore } from '../../store/mapStore'
import { SabiasQueTarjeta } from './SabiasQueTarjeta'

/** Ancho del bloque. El mapa NO le reserva lugar (la provincia queda centrada
 * como siempre): el botón es chico y el texto desplegado puede quedar sobre el
 * aire vacío del costado; el bloque no captura clics fuera de sí mismo. */
const ANCHO_PX = 360

/** "¿Sabías que…?" a la izquierda del mapa de la provincia (solo desktop
 * ancho, mismo criterio que MapIntro). Ocupa el lugar de la bienvenida, que se
 * retira al elegir una provincia. No captura clics; la `key` hace que la
 * tarjeta vuelva a entrar al pasar de una provincia a otra. */
export function SabiasQueLateral() {
  const headerHeight = useMapStore((s) => s.headerHeight)
  const provinciaId = useMapStore((s) => s.provinciaSeleccionada)
  if (!provinciaId) return null

  return (
    <div
      style={{ top: headerHeight, width: ANCHO_PX }}
      className="pointer-events-none fixed bottom-0 left-0 z-20 flex items-start pl-10 pr-4 pt-[12vh]"
    >
      <SabiasQueTarjeta
        key={provinciaId}
        provinciaId={provinciaId}
        variante="lateral"
      />
    </div>
  )
}
