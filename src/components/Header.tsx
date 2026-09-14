import { GlobalSearch } from '../features/search/GlobalSearch'

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-neutral-800 bg-neutral-950 px-6">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-100">
        Cartografía Cultural Argentina
      </h1>
      <GlobalSearch />
    </header>
  )
}
