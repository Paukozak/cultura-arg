export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-6 py-4">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-100">
        Cartografía Cultural Argentina
      </h1>
      <input
        type="search"
        placeholder="Buscar provincia o espacio cultural…"
        disabled
        className="w-full max-w-sm rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-400 placeholder:text-neutral-600 disabled:cursor-not-allowed"
      />
    </header>
  )
}
