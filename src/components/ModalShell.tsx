import { motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Estructura común de los modales centrados de la app: fondo oscuro
 * clickeable para cerrar, tecla Escape, encabezado con título + botón de
 * cerrar, y el marco animado del cuadro de diálogo. La comparten el modal
 * de "Cómo se hizo"/tutorial (`ModalInfoContent` en `ModalInfo.tsx`) y el
 * detalle de la leyenda del mapa (`LegendDetail` en `Legend.tsx`), que solo
 * difieren en el ancho máximo y en cómo envuelven su contenido. */
export function ModalShell({
  tituloId,
  titulo,
  onCerrar,
  maxWidthClassName = 'max-w-lg',
  children,
}: {
  tituloId: string
  titulo: ReactNode
  onCerrar: () => void
  maxWidthClassName?: string
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (!dialogRef.current?.contains(e.target as Node)) onCerrar()
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`flex max-h-[85vh] w-full ${maxWidthClassName} flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-5">
          <h2 id={tituloId} className="text-lg font-semibold text-neutral-100">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M18 6 6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}
