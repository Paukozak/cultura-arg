import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { provinciasGeo } from '../../data/provincias'
import { useMapStore } from '../../store/mapStore'
import {
  buildColorScales,
  desglosarEscala,
  pasosActivos,
  SIN_DATOS_COLOR,
} from './colorScales'

const UNIDAD: Record<'densidad' | 'total', string> = {
  densidad: 'ESPACIOS/100K',
  total: 'ESPACIOS',
}

const TITULO: Record<'densidad' | 'total', string> = {
  densidad: 'Densidad de espacios culturales',
  total: 'Total de espacios culturales',
}

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(n)
}

function LegendDetail({ onCerrar }: { onCerrar: () => void }) {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const modoDaltonico = useMapStore((s) => s.modoDaltonico)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCerrar])

  const scales = useMemo(
    () => buildColorScales(provinciasGeo.features, modoDaltonico),
    [modoDaltonico],
  )
  const scale = capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale
  const escalones = useMemo(() => desglosarEscala(scale), [scale])

  const filas = useMemo(() => {
    return provinciasGeo.features
      .map((f) => {
        const valor =
          capaActiva === 'densidad' ? f.properties.densidadPor100k : f.properties.totalEspacios
        const color = valor === null ? SIN_DATOS_COLOR : scale(valor)
        return { nombre: f.properties.nombre, valor, color }
      })
      .sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1))
  }, [capaActiva, scale])

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
        aria-labelledby="leyenda-detalle-titulo"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-800 p-5">
          <h2 id="leyenda-detalle-titulo" className="text-lg font-semibold text-neutral-100">
            {TITULO[capaActiva]}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-full border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto p-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Escala ({UNIDAD[capaActiva]})
            </h3>
            <div className="flex flex-col gap-1.5">
              {[...escalones].reverse().map((escalon) => (
                <div key={escalon.color} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-4 w-4 shrink-0 rounded"
                    style={{ backgroundColor: escalon.color }}
                  />
                  <span className="font-mono text-neutral-300">
                    {formatNumero(escalon.min)} – {formatNumero(escalon.max)}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-sm">
                <span
                  className="h-4 w-4 shrink-0 rounded"
                  style={{ backgroundColor: SIN_DATOS_COLOR }}
                />
                <span className="text-neutral-500">Sin datos de densidad</span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-wide text-neutral-500">
              Las 24 provincias
            </h3>
            <div className="flex flex-col">
              {filas.map((fila) => (
                <div
                  key={fila.nombre}
                  className="flex items-center gap-3 border-b border-neutral-900 py-1.5 text-sm last:border-b-0"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: fila.color }}
                  />
                  <span className="flex-1 truncate text-neutral-200">{fila.nombre}</span>
                  <span className="font-mono text-xs text-neutral-400">
                    {fila.valor === null ? 's/d' : formatNumero(fila.valor)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Legend() {
  const capaActiva = useMapStore((s) => s.capaActiva)
  const modoDaltonico = useMapStore((s) => s.modoDaltonico)
  const [abierto, setAbierto] = useState(false)

  const scales = useMemo(
    () => buildColorScales(provinciasGeo.features, modoDaltonico),
    [modoDaltonico],
  )

  const scale = capaActiva === 'densidad' ? scales.densidadScale : scales.totalScale
  const valores = scale.domain()
  const min = valores[0]
  const max = valores[valores.length - 1]
  const pasos = pasosActivos(modoDaltonico)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Ver el panorama completo de la escala de color"
        className="rounded-2xl border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-left text-sm shadow-lg shadow-black/50 backdrop-blur transition-colors hover:border-neutral-700"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wide text-neutral-500">
            {UNIDAD[capaActiva]}
          </span>
          <div className="flex overflow-hidden rounded">
            {pasos.map((color) => (
              <span key={color} className="h-2.5 w-6" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="flex justify-between font-mono text-xs text-neutral-500">
            <span>{formatNumero(min)}</span>
            <span>{formatNumero(max)}</span>
          </div>
        </div>
      </button>
      <AnimatePresence>
        {abierto && <LegendDetail onCerrar={() => setAbierto(false)} />}
      </AnimatePresence>
    </>
  )
}
