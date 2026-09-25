import { useEffect, useRef } from 'react'
import { provinciasGeo } from '../data/provincias'
import { useMapStore } from '../store/mapStore'
import { normalizar } from './texto'

// Slug legible a partir del nombre de la provincia (sin acentos, en
// minúscula, espacios/puntuación como guiones) para usar en la URL en vez
// del id numérico del store ("14"). Los 24 nombres reales no colisionan
// entre sí una vez normalizados (verificado a mano), así que no hace falta
// desambiguar.
function slugParaProvincia(nombre: string): string {
  return normalizar(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const SLUG_POR_ID = new Map(
  provinciasGeo.features.map((f) => [
    f.properties.id,
    slugParaProvincia(f.properties.nombre),
  ]),
)
const ID_POR_SLUG = new Map(
  provinciasGeo.features.map((f) => [
    slugParaProvincia(f.properties.nombre),
    f.properties.id,
  ]),
)

// Esquema de URLs reales por provincia: `/` sin nada elegido,
// `/provincia/:slug` con panel abierto, `/provincia/:slug/espacios` con la
// vista completa. `:slug` es el nombre de la provincia legible (p. ej.
// "cordoba"), no el id del store — internamente todo sigue usando el id.
function urlParaEstado(
  provinciaId: string | null,
  vistaCompleta: boolean,
): string {
  if (!provinciaId) return '/'
  const slug = SLUG_POR_ID.get(provinciaId) ?? provinciaId
  return vistaCompleta ? `/provincia/${slug}/espacios` : `/provincia/${slug}`
}

/**
 * Sincroniza los paneles superpuestos (provincia elegida, vista completa)
 * con el historial del navegador: abrir uno agrega una entrada de
 * historial, así el gesto de "atrás" del sistema (deslizar desde el borde
 * en mobile, o el botón atrás del navegador) cierra ese panel en vez de
 * sacar a la persona de la página entera.
 *
 * Dos niveles, el más profundo se cierra primero:
 *  1. provincia elegida (ProvincePanel)
 *  2. vista completa (ProvinceFullView) — siempre con una provincia ya
 *     elegida debajo (ver GlobalSearch.tsx: toda apertura de vista completa
 *     empieza eligiendo la provincia), así que la profundidad real nunca
 *     "salta" un nivel.
 *
 * Si un nivel se cierra por una acción propia (el botón "volver", clickear
 * afuera) en vez de por el gesto, este hook retrocede un paso de historial
 * a mano (`history.go`) para no dejar una entrada fantasma que se coma un
 * "atrás" real más adelante sin cerrar nada visible.
 */
export function useHistorialPaneles() {
  const provinciaSeleccionada = useMapStore((s) => s.provinciaSeleccionada)
  const vistaCompleta = useMapStore((s) => s.vistaCompleta)
  const seleccionarProvincia = useMapStore((s) => s.seleccionarProvincia)
  const setVistaCompleta = useMapStore((s) => s.setVistaCompleta)
  const abrirVistaCompleta = useMapStore((s) => s.abrirVistaCompleta)

  const profundidad = (provinciaSeleccionada ? 1 : 0) + (vistaCompleta ? 1 : 0)
  // Cuántas entradas de historial cree este hook que ya empujó.
  const entradasEmpujadas = useRef(0)
  // La restauración de abajo dispara `seleccionarProvincia`/`abrirVistaCompleta`,
  // pero ese cambio de store recién se ve reflejado en un re-render
  // posterior: la primera corrida del efecto que empuja historial (más
  // abajo) todavía ve la `profundidad` vieja (0) mientras `entradasEmpujadas`
  // ya fue adelantada a la profundidad restaurada, así que sin esta bandera
  // ese primer pase la interpretaría como un descenso y llamaría a
  // `history.go` de más, pisando la restauración recién hecha.
  const primeraCorridaEmpuje = useRef(true)
  // Marca que el próximo descenso de profundidad vino de un popstate (gesto
  // o botón atrás): el navegador ya movió el historial solo, no hay que
  // compensarlo llamando a `history.go` de nuevo.
  const cerrandoPorGesto = useRef(false)
  // Marca que el `popstate` que está por llegar es el que dispara el propio
  // `history.go` de acá abajo (corrigiendo una entrada fantasma porque un
  // panel se cerró por su botón, p. ej. el "volver" de ProvinceFullView, no
  // por un gesto real) — `history.go` despacha ese `popstate` de forma
  // asíncrona, así que sin esta marca `onPopState` lo procesaba como un
  // "atrás" real y cerraba UN NIVEL DE MÁS del que el botón ya había
  // cerrado (p. ej. cerrar la vista completa terminaba también
  // deseleccionando la provincia, en vez de dejar el panel de la provincia
  // abierto detrás).
  const corrigiendoHistorial = useRef(false)

  // Restaura el estado (provincia elegida, vista completa) a partir de la
  // URL con la que se cargó la página, antes de que el efecto de abajo
  // empiece a empujar historial. Usa `replaceState` (no `pushState`): no
  // agrega una entrada nueva, solo le pega al estado inicial el `ccaPanel`
  // que le corresponde según la URL.
  useEffect(() => {
    const coincidencia = window.location.pathname.match(
      /^\/provincia\/([^/]+)(\/espacios)?\/?$/,
    )
    if (!coincidencia) return
    const [, slug, sufijoEspacios] = coincidencia
    const id = ID_POR_SLUG.get(slug)
    if (!id) return

    const vistaCompletaInicial = Boolean(sufijoEspacios)
    const profundidadInicial = vistaCompletaInicial ? 2 : 1
    entradasEmpujadas.current = profundidadInicial
    history.replaceState(
      { ccaPanel: profundidadInicial },
      '',
      urlParaEstado(id, vistaCompletaInicial),
    )
    seleccionarProvincia(id)
    if (vistaCompletaInicial) {
      abrirVistaCompleta()
    }
  }, [seleccionarProvincia, abrirVistaCompleta])

  useEffect(() => {
    if (primeraCorridaEmpuje.current) {
      primeraCorridaEmpuje.current = false
      return
    }
    if (profundidad > entradasEmpujadas.current) {
      for (let i = entradasEmpujadas.current; i < profundidad; i++) {
        history.pushState(
          { ccaPanel: i + 1 },
          '',
          urlParaEstado(provinciaSeleccionada, vistaCompleta),
        )
      }
      entradasEmpujadas.current = profundidad
    } else if (profundidad < entradasEmpujadas.current) {
      const diferencia = entradasEmpujadas.current - profundidad
      entradasEmpujadas.current = profundidad
      if (cerrandoPorGesto.current) {
        cerrandoPorGesto.current = false
      } else {
        corrigiendoHistorial.current = true
        history.go(-diferencia)
      }
    } else {
      // La profundidad no cambió pero el contenido sí (p. ej. se eligió otra
      // provincia con el panel ya abierto, sin cerrarlo primero): la URL
      // quedaría mostrando la provincia vieja si no se sincroniza acá.
      // `replaceState`, no `pushState`: sigue siendo el mismo nivel de
      // historial, no uno nuevo.
      history.replaceState(
        { ccaPanel: profundidad },
        '',
        urlParaEstado(provinciaSeleccionada, vistaCompleta),
      )
    }
  }, [profundidad, provinciaSeleccionada, vistaCompleta])

  useEffect(() => {
    function onPopState() {
      if (corrigiendoHistorial.current) {
        corrigiendoHistorial.current = false
        return
      }
      cerrandoPorGesto.current = true
      if (vistaCompleta) {
        setVistaCompleta(false)
      } else if (provinciaSeleccionada) {
        seleccionarProvincia(null)
      } else {
        // No hay nada abierto para cerrar: este "atrás" no era nuestro (p.
        // ej. se restauró de entrada en una entrada empujada por una razón
        // ajena). No queda nada por hacer.
        cerrandoPorGesto.current = false
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [
    vistaCompleta,
    provinciaSeleccionada,
    setVistaCompleta,
    seleccionarProvincia,
  ])
}
