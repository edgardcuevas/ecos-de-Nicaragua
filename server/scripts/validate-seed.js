import { readFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const repoRoot = resolve(serverDir, '..')
const seedDir = resolve(serverDir, 'db', 'seed')

const SLUGS_CANONICOS = [
  'la-mocuana', 'el-cadejo', 'la-carreta-nagua', 'la-cegua', 'la-llorona', 'el-padre-sin-cabeza'
]

async function existe(ruta) { try { await access(ruta); return true } catch { return false } }

async function leerJson(nombre) {
  const texto = await readFile(resolve(seedDir, nombre), 'utf8')
  return JSON.parse(texto)
}

export async function validarSeed() {
  const errores = []
  const advertencias = []

  const regiones = await leerJson('regiones.json')
  const categorias = await leerJson('categorias.json')
  const fuentes = await leerJson('fuentes.json')
  const leyendas = await leerJson('leyendas.json')
  const planes = await leerJson('planes.json')

  // Regiones
  if (!Array.isArray(regiones) || regiones.length !== 17) {
    errores.push(`regiones.json debe tener exactamente 17 regiones (tiene ${regiones?.length})`)
  }
  const codigosRegion = new Set()
  for (const r of regiones || []) {
    if (!r.codigo || !r.nombre || !r.tipo) errores.push(`Región inválida: ${JSON.stringify(r)}`)
    if (codigosRegion.has(r.codigo)) errores.push(`Código de región duplicado: ${r.codigo}`)
    codigosRegion.add(r.codigo)
  }

  // Categorias
  if (!Array.isArray(categorias) || categorias.length !== 4) {
    errores.push(`categorias.json debe tener exactamente 4 categorías (tiene ${categorias?.length})`)
  }
  const slugsCategoria = new Set()
  for (const c of categorias || []) {
    if (!c.slug || !c.nombre) errores.push(`Categoría inválida: ${JSON.stringify(c)}`)
    if (slugsCategoria.has(c.slug)) errores.push(`Slug de categoría duplicado: ${c.slug}`)
    slugsCategoria.add(c.slug)
  }

  // Fuentes
  if (!Array.isArray(fuentes) || fuentes.length < 6) {
    errores.push(`fuentes.json debe tener al menos 6 fuentes (tiene ${fuentes?.length})`)
  }
  const clavesFuente = new Set()
  for (const f of fuentes || []) {
    if (!f.clave || !f.titulo || !f.tipo) errores.push(`Fuente inválida: ${JSON.stringify(f)}`)
    if (clavesFuente.has(f.clave)) errores.push(`Clave de fuente duplicada: ${f.clave}`)
    clavesFuente.add(f.clave)
    if (!['libro', 'articulo', 'sitio_web', 'testimonio_oral', 'otro'].includes(f.tipo)) {
      errores.push(`Tipo de fuente inválido: ${f.tipo}`)
    }
  }

  // Planes
  if (!Array.isArray(planes) || !planes.some(p => p.activo)) {
    errores.push('planes.json debe tener al menos un plan activo')
  }

  // Leyendas
  if (!Array.isArray(leyendas) || leyendas.length !== 6) {
    errores.push(`leyendas.json debe tener exactamente 6 leyendas (tiene ${leyendas?.length})`)
  }
  const slugsLeyenda = new Set()
  const rutasArchivos = new Set()
  for (const l of leyendas || []) {
    if (!SLUGS_CANONICOS.includes(l.slug)) {
      errores.push(`Slug de leyenda no canónico o duplicado: ${l.slug}`)
    }
    if (slugsLeyenda.has(l.slug)) errores.push(`Slug de leyenda duplicado: ${l.slug}`)
    slugsLeyenda.add(l.slug)

    if (!l.titulo || !l.categoria || !l.resumen || !l.historia || !l.alcance) {
      errores.push(`Leyenda ${l.slug} falta campos obligatorios`)
    }
    if (!slugsCategoria.has(l.categoria)) {
      errores.push(`Leyenda ${l.slug} referencia categoría inexistente: ${l.categoria}`)
    }
    if (!['nacional', 'regional', 'local'].includes(l.alcance)) {
      errores.push(`Leyenda ${l.slug} alcance inválido: ${l.alcance}`)
    }

    // regiones
    const fuentesReferenciadas = new Set()
    for (const v of l.versiones || []) {
      if (v.fuente) fuentesReferenciadas.add(v.fuente)
    }
    for (const r of l.regiones || []) {
      if (!codigosRegion.has(r.codigo)) errores.push(`Leyenda ${l.slug} referencia región inexistente: ${r.codigo}`)
      if (!clavesFuente.has(r.fuente)) errores.push(`Leyenda ${l.slug} referencia fuente inexistente: ${r.fuente}`)
      if (!['verificado', 'testimonio_oral', 'pendiente', 'sin_verificar'].includes(r.nivelVerificacion)) {
        errores.push(`Leyenda ${l.slug} nivel de verificación inválido: ${r.nivelVerificacion}`)
      }
      if (r.fuente) fuentesReferenciadas.add(r.fuente)
    }
    if (fuentesReferenciadas.size < 2) {
      errores.push(`Leyenda ${l.slug} debe referenciar al menos 2 fuentes (tiene ${fuentesReferenciadas.size})`)
    }

    // versiones
    if (!Array.isArray(l.versiones) || l.versiones.length < 1) {
      errores.push(`Leyenda ${l.slug} debe tener al menos una versión`)
    } else {
      const ordenes = new Set()
      let gratuitas = 0
      for (const v of l.versiones) {
        if (!v.titulo || !v.contenido) errores.push(`Versión inválida en ${l.slug}`)
        if (ordenes.has(v.orden)) errores.push(`Orden de versión duplicado en ${l.slug}: ${v.orden}`)
        ordenes.add(v.orden)
        if (v.esPremium === false) gratuitas++
        if (v.fuente && !clavesFuente.has(v.fuente)) errores.push(`Versión de ${l.slug} referencia fuente inexistente: ${v.fuente}`)
      }
      if (gratuitas < 1) errores.push(`Leyenda ${l.slug} debe tener al menos una versión gratuita`)
    }

    // imagenes
    if (!Array.isArray(l.imagenes) || l.imagenes.length < 1) {
      errores.push(`Leyenda ${l.slug} debe tener al menos una imagen`)
    } else {
      let principales = 0
      for (const img of l.imagenes) {
        if (!img.archivo || !img.ruta || !img.textoAlternativo || !img.licencia) {
          errores.push(`Imagen inválida en ${l.slug}: ${JSON.stringify(img)}`)
        }
        if (img.esPrincipal) principales++
        if (img.licencia === '' ) errores.push(`Licencia vacía en imagen de ${l.slug}`)
        if (img.licencia === 'PENDIENTE') advertencias.push(`Licencia PENDIENTE en imagen de ${l.slug}`)
        // archivo existe
        const origen = resolve(repoRoot, img.archivo)
        if (!(await existe(origen))) errores.push(`Archivo de imagen no encontrado: ${img.archivo}`)
        // ruta única
        if (rutasArchivos.has(img.ruta)) errores.push(`Ruta de archivo repetida: ${img.ruta}`)
        rutasArchivos.add(img.ruta)
      }
      if (principales !== 1) errores.push(`Leyenda ${l.slug} debe tener exactamente una imagen principal (tiene ${principales})`)
    }

    // audios
    if (!Array.isArray(l.audios) || l.audios.length < 1) {
      errores.push(`Leyenda ${l.slug} debe tener al menos un audio`)
    } else {
      for (const a of l.audios) {
        if (!a.archivo || !a.ruta || !a.titulo || !a.licencia) {
          errores.push(`Audio inválido en ${l.slug}: ${JSON.stringify(a)}`)
        }
        if (a.licencia === 'PENDIENTE') advertencias.push(`Licencia PENDIENTE en audio de ${l.slug}`)
        const origen = resolve(repoRoot, a.archivo)
        if (!(await existe(origen))) errores.push(`Archivo de audio no encontrado: ${a.archivo}`)
        if (rutasArchivos.has(a.ruta)) errores.push(`Ruta de archivo repetida: ${a.ruta}`)
        rutasArchivos.add(a.ruta)
      }
    }

    // preguntas
    if (!Array.isArray(l.preguntas) || l.preguntas.length !== 5) {
      errores.push(`Leyenda ${l.slug} debe tener exactamente 5 preguntas (tiene ${l.preguntas?.length})`)
    } else {
      const ordenes = new Set()
      for (const p of l.preguntas) {
        if (!p.enunciado) errores.push(`Pregunta sin enunciado en ${l.slug}`)
        if (ordenes.has(p.orden)) errores.push(`Orden de pregunta duplicado en ${l.slug}: ${p.orden}`)
        ordenes.add(p.orden)
        if (![1,2,3,4,5].includes(p.orden)) errores.push(`Orden de pregunta inválido en ${l.slug}: ${p.orden}`)
        if (!Array.isArray(p.opciones) || p.opciones.length !== 4) {
          errores.push(`Pregunta ${p.orden} de ${l.slug} debe tener 4 opciones`)
          continue
        }
        const correctas = p.opciones.filter(o => o.esCorrecta).length
        if (correctas !== 1) errores.push(`Pregunta ${p.orden} de ${l.slug} debe tener exactamente 1 respuesta correcta (tiene ${correctas})`)
        const opOrdenes = new Set()
        for (const o of p.opciones) {
          if (!o.texto) errores.push(`Opción vacía en pregunta ${p.orden} de ${l.slug}`)
          if (opOrdenes.has(o.orden)) errores.push(`Orden de opción duplicado en pregunta ${p.orden} de ${l.slug}`)
          opOrdenes.add(o.orden)
        }
        // esPremium rule
        if (p.orden <= 2 && p.esPremium !== false) errores.push(`Pregunta ${p.orden} de ${l.slug} (free) debe tener esPremium false`)
        if (p.orden >= 3 && p.esPremium !== true) errores.push(`Pregunta ${p.orden} de ${l.slug} (premium) debe tener esPremium true`)
      }
      if (ordenes.size !== 5 || ![1,2,3,4,5].every(n => ordenes.has(n))) {
        errores.push(`Leyenda ${l.slug} debe tener preguntas con órdenes 1 a 5`)
      }
    }
  }

  // slugs canónicos completos
  for (const slug of SLUGS_CANONICOS) {
    if (!slugsLeyenda.has(slug)) errores.push(`Falta leyenda canónica: ${slug}`)
  }

  if (advertencias.length) {
    console.warn('Advertencias:')
    for (const a of advertencias) console.warn(' - ' + a)
  }

  if (errores.length) {
    console.error('Errores de validación:')
    for (const e of errores) console.error(' - ' + e)
    return { ok: false, errores, advertencias }
  }

  console.log('Seed válido')
  return { ok: true, errores: [], advertencias }
}

const esCLI = (process.argv[1] || '').replace(/\\/g, '/').endsWith('validate-seed.js')
if (esCLI) {
  validarSeed().then((r) => { if (!r.ok) process.exit(1) }).catch((e) => { console.error(e); process.exit(1) })
}
