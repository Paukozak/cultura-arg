import {
  BookMarked,
  BookOpen,
  Building2,
  Clapperboard,
  Drama,
  Flag,
  Globe,
  Landmark,
  Library,
  Palette,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const ICONO_POR_DEFECTO: LucideIcon = Landmark

// Objeto plano (no una función) a propósito: así en los componentes el ícono
// se resuelve como un acceso a un valor ya existente (`ICONOS_POR_CATEGORIA[x]`)
// y no como el resultado de llamar a una función durante el render.
export const ICONOS_POR_CATEGORIA: Record<string, LucideIcon> = {
  Museos: Building2,
  'Bibliotecas Populares': Library,
  'Bibliotecas Especializadas': BookMarked,
  'Salas de Teatro': Drama,
  'Centros Culturales': Users,
  Cines: Clapperboard,
  'Galerías de Arte': Palette,
  Librerías: BookOpen,
  'Monumentos y Lugares Históricos': Landmark,
  'Sitios Patrimonio UNESCO': Globe,
  'Casas del Bicentenario': Flag,
}
