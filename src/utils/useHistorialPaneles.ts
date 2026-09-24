import { useEffect, useRef } from 'react'
import { useMapStore } from '../store/mapStore'

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

  const profundidad = (provinciaSeleccionada ? 1 : 0) + (vistaCompleta ? 1 : 0)
  // Cuántas entradas de historial cree este hook que ya empujó.
  const entradasEmpujadas = useRef(0)
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

  useEffect(() => {
    if (profundidad > entradasEmpujadas.current) {
      for (let i = entradasEmpujadas.current; i < profundidad; i++) {
        history.pushState({ ccaPanel: i + 1 }, '')
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
    }
  }, [profundidad])

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
