import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  tieneError: boolean
}

/** Red de seguridad de último nivel: si un componente tira una excepción
 * durante el render (un caso de datos inesperado, un null no contemplado),
 * evita la pantalla blanca y muestra un mensaje con opción de recargar.
 * `getDerivedStateFromError`/`componentDidCatch` son el único patrón de
 * React que cubre errores de render — no hay equivalente con hooks. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { tieneError: false }

  static getDerivedStateFromError(): State {
    return { tieneError: true }
  }

  render() {
    if (this.state.tieneError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-semibold text-neutral-100">
              Uy, algo salió mal.
            </h2>
            <p className="text-sm text-neutral-400">
              Recargá la página para intentar de nuevo.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
