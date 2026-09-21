// Memoria de "ya vio la bienvenida de mobile" (MapIntroMobil.tsx). Mismo patrón
// que el tema y el modo daltónico (`cca-tema`, `cca-daltonico` en
// mapStore.ts): una clave en localStorage.
export const INTRO_VISTA_KEY = 'cca-intro-vista'

/** ¿Ya se vio la bienvenida en este dispositivo? Con `?intro` en la URL
 * responde que no aunque se haya visto — para poder revisarla sin tener que
 * borrar el localStorage a mano. Nunca lanza: se llama al montar el
 * componente, y una excepción acá tumbaría toda la app. */
export function yaVista(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('intro')) return false
    return localStorage.getItem(INTRO_VISTA_KEY) === '1'
  } catch {
    // localStorage bloqueado (p. ej. navegación privada en Safari): se
    // muestra, pero no molesta más que una vez por visita.
    return false
  }
}

/** Recuerda que la bienvenida ya se vio. Sin localStorage no hay dónde
 * guardarlo: no falla, y la próxima visita se muestra de nuevo. */
export function marcarVista(): void {
  try {
    localStorage.setItem(INTRO_VISTA_KEY, '1')
  } catch {
    // Ver arriba.
  }
}
