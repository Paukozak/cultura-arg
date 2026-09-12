/**
 * Parser CSV mínimo (RFC 4180): soporta campos entre comillas con comas y
 * comillas escapadas ("") embebidas, que es lo que traen algunos CSV de SInCA
 * (ej. direcciones con comas). Devuelve un array de objetos usando la primera
 * fila como encabezado.
 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\r') {
      // ignorado, el fin de línea real lo marca \n
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }

  const dataRows = rows.filter((r) => r.length > 1 || r[0] !== '')
  const headers = dataRows[0].map((h) => h.trim())
  return dataRows.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = (r[i] ?? '').trim()
    })
    return obj
  })
}
