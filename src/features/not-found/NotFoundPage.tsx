// Pantalla de reemplazo completo (no un overlay) para cualquier URL que no
// corresponda a nada navegable — ver App.tsx (lee `paginaNoEncontrada` del
// store) y useHistorialPaneles.ts (quien la marca al montar).
export function NotFoundPage() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-neutral-100">
      <p className="font-mono text-sm text-neutral-500">404</p>
      <h1 className="text-2xl font-medium">Esta página no existe</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        La dirección a la que intentaste entrar no corresponde a ningún mapa
        ni provincia.
      </p>
      <button
        type="button"
        onClick={() => {
          window.location.href = '/'
        }}
        className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        Volver al inicio
      </button>
    </div>
  )
}
