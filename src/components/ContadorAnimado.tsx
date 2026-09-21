import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

function formatNumero(n: number) {
  return new Intl.NumberFormat('es-AR').format(n)
}

/** Número que cuenta de 0 a `valor` al montarse (`animate` de Motion). Empieza
 * a contar cada vez que se monta — quien lo use lo monta junto con el bloque
 * que aparece, así la cuenta acompaña a la entrada.
 *
 * Reserva el ancho del número final (un duplicado invisible) y dibuja el
 * número que va contando encima: sin eso el texto de alrededor se correría
 * cada vez que el número gana un dígito o un punto de miles. El número crece
 * desde la izquierda: pensado para ir solo o abriendo una línea, no en medio
 * de una oración (ahí dejaría un hueco antes de la palabra que lo sigue).
 *
 * Va aparte de la config global de `main.tsx` (`reducedMotion="user"`), que
 * frena las animaciones de transformación pero no un contador: con "reducir
 * movimiento" se muestra el número final de entrada. Los lectores de pantalla
 * leen solo el valor final. */
export function ContadorAnimado({
  valor,
  className = '',
}: {
  valor: number
  className?: string
}) {
  const reducirMovimiento = useReducedMotion()
  const [actual, setActual] = useState(0)

  useEffect(() => {
    if (reducirMovimiento) return
    const controles = animate(0, valor, {
      duration: 1.6,
      delay: 0.4,
      ease: 'easeOut',
      onUpdate: (v) => setActual(Math.round(v)),
    })
    return () => controles.stop()
  }, [reducirMovimiento, valor])

  const final = formatNumero(valor)
  return (
    <span className={`relative inline-block tabular-nums ${className}`}>
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="invisible">
        {final}
      </span>
      <span aria-hidden="true" className="absolute inset-y-0 left-0">
        {formatNumero(reducirMovimiento ? valor : actual)}
      </span>
    </span>
  )
}
