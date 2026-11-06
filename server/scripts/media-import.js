import { readFile, writeFile, mkdir, stat, copyFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..') // ecos-de-Nicaragua
const serverRoot = path.resolve(__dirname, '..')

const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT || path.join(serverRoot, 'storage/media'))

let sharp = null
try {
  sharp = (await import('sharp')).default
} catch {
  console.warn('sharp no disponible: se copiarán las imágenes sin convertir.')
}

async function exists(p) {
  try { await stat(p); return true } catch { return false }
}

async function resolveSource(archivo) {
  const candidates = [
    path.resolve(process.cwd(), archivo),
    path.resolve(projectRoot, archivo),
    path.resolve(serverRoot, archivo),
  ]
  for (const c of candidates) {
    if (await exists(c)) return c
  }
  return null
}

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true })
}

async function importFile(archivo, ruta) {
  const src = await resolveSource(archivo)
  if (!src) {
    throw new Error(`Archivo origen no encontrado: ${archivo}`)
  }
  const dest = path.resolve(MEDIA_ROOT, ruta)
  await ensureDir(dest)

  // idempotente: omitir si destino existe y es más nuevo
  if (await exists(dest)) {
    const [sSrc, sDest] = await Promise.all([stat(src), stat(dest)])
    if (sDest.mtimeMs >= sSrc.mtimeMs) {
      console.log(`Omitido (actualizado): ${ruta}`)
      return
    }
  }

  const ext = path.extname(src).toLowerCase()
  const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)

  if (isImage && sharp) {
    const metadata = await sharp(src).metadata()
    const pipeline = sharp(src).rotate().resize({ width: 1600, withoutEnlargement: true })
    const buf = await pipeline.webp({ quality: 80 }).toBuffer()
    await writeFile(dest, buf)
    console.log(`Imagen convertida: ${ruta} (${metadata.width}x${metadata.height})`)
  } else {
    await copyFile(src, dest)
    console.log(`Copiado: ${ruta}`)
  }

  // advertencia de audio grande
  if (!isImage) {
    const s = await stat(src)
    if (s.size > 10 * 1024 * 1024) {
      console.warn(`Advertencia: audio mayor a 10 MB: ${archivo}`)
    }
  }
}

async function main() {
  const leyendasPath = path.join(serverRoot, 'db/seed/leyendas.json')
  if (!(await exists(leyendasPath))) {
    console.log('No existe leyendas.json; nada que importar.')
    return
  }
  const leyendas = JSON.parse(await readFile(leyendasPath, 'utf8'))
  for (const leyenda of leyendas) {
    for (const img of leyenda.imagenes || []) {
      await importFile(img.archivo, img.ruta)
    }
    for (const audio of leyenda.audios || []) {
      await importFile(audio.archivo, audio.ruta)
    }
  }
  console.log('Importación de multimedia finalizada.')
}

main().catch((error) => {
  console.error('Error en media:import:', error.message || error)
  process.exit(1)
})