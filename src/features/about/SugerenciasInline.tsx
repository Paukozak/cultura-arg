import { ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

const ENDPOINT_FORMSUBMIT = 'https://formsubmit.co/ajax/paukozakr@gmail.com'

type Estado = 'listo' | 'enviando' | 'exito' | 'error'

/** Buzón de sugerencias/reporte de errores del modal "¿Cómo se hizo?" — un
 * único campo libre, sin backend propio: el POST va directo a FormSubmit.co
 * (servicio gratis que reenvía por mail), con `_captcha: "false"` y el
 * honeypot `_honey` que reconoce solo para descartar envíos de bots. Arranca
 * colapsado y se expande en el mismo lugar, sin abrir otro modal ni navegar. */
export function SugerenciasInline() {
  const [abierto, setAbierto] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [estado, setEstado] = useState<Estado>('listo')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (abierto) textareaRef.current?.focus()
  }, [abierto])

  function alternar() {
    setAbierto((estaAbierto) => {
      const siguiente = !estaAbierto
      // Al cerrar se descarta cualquier estado previo (mensaje, éxito o
      // error): reabrir arranca siempre con un formulario limpio, no con el
      // "Gracias, lo recibimos" de un envío anterior.
      if (!siguiente) {
        setMensaje('')
        setEstado('listo')
      }
      return siguiente
    })
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!mensaje.trim()) return

    setEstado('enviando')
    try {
      const respuesta = await fetch(ENDPOINT_FORMSUBMIT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(e.currentTarget),
      })
      if (!respuesta.ok) throw new Error('FormSubmit devolvió un error')
      setEstado('exito')
    } catch {
      setEstado('error')
    }
  }

  const enviando = estado === 'enviando'

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-controls="sugerencias-panel"
        className="flex items-center gap-1.5 text-left text-sm font-medium text-accent hover:underline"
      >
        <span>¿Encontraste un error o te falta un espacio?</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div id="sugerencias-panel" className="flex flex-col gap-2">
          {estado !== 'exito' && (
            <form onSubmit={onSubmit} className="flex flex-col gap-2">
              <label htmlFor="sugerencia-mensaje" className="sr-only">
                Tu sugerencia o reporte
              </label>
              <textarea
                ref={textareaRef}
                id="sugerencia-mensaje"
                name="message"
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                disabled={enviando}
                placeholder="Contanos qué espacio falta o qué error encontraste…"
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-accent disabled:opacity-50"
              />
              <input
                type="hidden"
                name="_subject"
                value="Sugerencia desde CulturArg"
              />
              <input type="hidden" name="_captcha" value="false" />
              {/* Honeypot: invisible para una persona, pero un bot que
                  completa todos los campos de un formulario lo llena —
                  FormSubmit descarta el envío si llega con algo adentro. */}
              <input
                type="text"
                name="_honey"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '-9999px',
                  width: 0,
                  height: 0,
                }}
              />
              <button
                type="submit"
                disabled={enviando || !mensaje.trim()}
                className="flex w-fit items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {enviando && (
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                )}
                {enviando
                  ? 'Enviando…'
                  : estado === 'error'
                    ? 'Reintentar'
                    : 'Enviar'}
              </button>
            </form>
          )}
          <p aria-live="polite" className="text-xs text-neutral-400">
            {estado === 'exito' && 'Gracias, lo recibimos.'}
            {estado === 'error' && 'No se pudo enviar. Probá de nuevo.'}
          </p>
        </div>
      )}
    </div>
  )
}
