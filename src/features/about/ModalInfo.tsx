import { AnimatePresence } from 'motion/react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { ModalShell } from '../../components/ModalShell'

export function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs uppercase tracking-wide text-neutral-500">
        {titulo}
      </h3>
      {children}
    </section>
  )
}

export function ModalInfoContent({
  tituloId,
  titulo,
  onCerrar,
  children,
}: {
  tituloId: string
  titulo: string
  onCerrar: () => void
  children: ReactNode
}) {
  return (
    <ModalShell tituloId={tituloId} titulo={titulo} onCerrar={onCerrar}>
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 text-sm leading-relaxed text-neutral-300 text-justify">
        {children}
      </div>
    </ModalShell>
  )
}

export function BotonAbrirModal({
  icono: Icono,
  label,
  children,
}: {
  icono: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  children: (props: { onCerrar: () => void }) => ReactNode
}) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={label}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-neutral-800 px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:text-neutral-100 sm:py-1.5 sm:text-sm"
      >
        <Icono className="h-4 w-4 sm:hidden" aria-hidden={true} />
        <span className="hidden sm:inline">{label}</span>
      </button>
      <AnimatePresence>
        {abierto && children({ onCerrar: () => setAbierto(false) })}
      </AnimatePresence>
    </>
  )
}
