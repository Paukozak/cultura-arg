import { ColorblindToggle } from './ColorblindToggle'
import { ComoSeHizo } from '../features/about/ComoSeHizo'
import { GlobalSearch } from '../features/search/GlobalSearch'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-neutral-800 bg-neutral-950 px-6">
      <h1 className="shrink-0 text-lg font-semibold tracking-tight text-neutral-100">
        Cultura Argentina
      </h1>
      {/* `flex-1`: sin esto, este contenedor solo mide lo que su propio
          contenido pide y `w-full max-w-md` del buscador (adentro) no tiene
          un 100% real contra el que resolverse — el buscador terminaba
          angosto y el placeholder se cortaba a mitad de palabra. */}
      <div className="flex flex-1 items-center justify-end gap-3">
        <GlobalSearch />
        <ColorblindToggle />
        <ComoSeHizo />
        <ThemeToggle />
      </div>
    </header>
  )
}
