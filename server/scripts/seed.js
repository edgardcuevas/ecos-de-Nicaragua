import { readFile } from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { dbConfig } from '../src/config.js'
import { validarSeed } from './validate-seed.js'

const seedDir = new URL('../db/seed/', import.meta.url)

async function leerJson(nombre) {
  return JSON.parse(await readFile(new URL(nombre, seedDir), 'utf8'))
}

async function main() {
  const validacion = await validarSeed()
  if (!validacion.ok) {
    console.error('Seed inválido; abortando.')
    process.exit(1)
  }

  const regionesJson = await leerJson('regiones.json')
  const categoriasJson = await leerJson('categorias.json')
  const fuentesJson = await leerJson('fuentes.json')
  const leyendasJson = await leerJson('leyendas.json')
  const planesJson = await leerJson('planes.json')

  const conn = await mysql.createConnection(dbConfig)
  try {
    await conn.beginTransaction()

    // Regiones
    for (const r of regionesJson) {
      await conn.execute(
        `INSERT INTO regiones (codigo, nombre, tipo) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo)`,
        [r.codigo, r.nombre, r.tipo],
      )
    }
    const [regionesRows] = await conn.query('SELECT id, codigo FROM regiones')
    const regionId = Object.fromEntries(regionesRows.map(r => [r.codigo, r.id]))

    // Categorias
    for (const c of categoriasJson) {
      await conn.execute(
        `INSERT INTO categorias (slug, nombre) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
        [c.slug, c.nombre],
      )
    }
    const [catRows] = await conn.query('SELECT id, slug FROM categorias')
    const catId = Object.fromEntries(catRows.map(c => [c.slug, c.id]))

    // Fuentes
    for (const f of fuentesJson) {
      await conn.execute(
        `INSERT INTO fuentes (clave, titulo, autor, tipo, referencia, url, licencia)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           titulo = VALUES(titulo), autor = VALUES(autor), tipo = VALUES(tipo),
           referencia = VALUES(referencia), url = VALUES(url), licencia = VALUES(licencia)`,
        [f.clave, f.titulo, f.autor, f.tipo, f.referencia, f.url, f.licencia],
      )
    }
    const [fuenteRows] = await conn.query('SELECT id, clave FROM fuentes WHERE clave IS NOT NULL')
    const fuenteId = Object.fromEntries(fuenteRows.map(f => [f.clave, f.id]))

    // Leyendas
    for (const l of leyendasJson) {
      const categoriaId = l.categoria ? catId[l.categoria] : null
      await conn.execute(
        `INSERT INTO leyendas (slug, titulo, categoria_id, resumen, historia, origen, alcance)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           titulo = VALUES(titulo), categoria_id = VALUES(categoria_id),
           resumen = VALUES(resumen), historia = VALUES(historia),
           origen = VALUES(origen), alcance = VALUES(alcance)`,
        [l.slug, l.titulo, categoriaId, l.resumen, l.historia, l.origen, l.alcance],
      )
      const [leyRows] = await conn.execute('SELECT id FROM leyendas WHERE slug = ?', [l.slug])
      const leyendaId = leyRows[0].id

      // borrar hijos
      await conn.execute('DELETE FROM leyenda_regiones WHERE leyenda_id = ?', [leyendaId])
      await conn.execute('DELETE FROM leyenda_versiones WHERE leyenda_id = ?', [leyendaId])
      await conn.execute('DELETE FROM imagenes WHERE leyenda_id = ?', [leyendaId])
      await conn.execute('DELETE FROM audios WHERE leyenda_id = ?', [leyendaId])
      await conn.execute('DELETE FROM preguntas WHERE leyenda_id = ?', [leyendaId])

      // regiones
      for (const r of l.regiones || []) {
        await conn.execute(
          `INSERT INTO leyenda_regiones (leyenda_id, region_id, fuente_id, nivel_verificacion, nota)
           VALUES (?, ?, ?, ?, ?)`,
          [leyendaId, regionId[r.codigo], fuenteId[r.fuente], r.nivelVerificacion, r.nota ?? null],
        )
      }

      // versiones
      for (const v of l.versiones || []) {
        await conn.execute(
          `INSERT INTO leyenda_versiones (leyenda_id, fuente_id, titulo, contenido, es_premium, orden)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [leyendaId, v.fuente ? fuenteId[v.fuente] : null, v.titulo, v.contenido, v.esPremium ? 1 : 0, v.orden],
        )
      }

      // imagenes
      for (const img of l.imagenes || []) {
        await conn.execute(
          `INSERT INTO imagenes (leyenda_id, ruta, texto_alternativo, licencia, es_principal, es_premium)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [leyendaId, img.ruta, img.textoAlternativo, img.licencia, img.esPrincipal ? 1 : 0, img.esPremium ? 1 : 0],
        )
      }

      // audios
      for (const a of l.audios || []) {
        await conn.execute(
          `INSERT INTO audios (leyenda_id, titulo, ruta, duracion_segundos, licencia, es_premium)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [leyendaId, a.titulo, a.ruta, a.duracionSegundos, a.licencia, a.esPremium ? 1 : 0],
        )
      }

      // preguntas
      for (const p of l.preguntas || []) {
        const [res] = await conn.execute(
          `INSERT INTO preguntas (leyenda_id, enunciado, explicacion, es_premium, orden)
           VALUES (?, ?, ?, ?, ?)`,
          [leyendaId, p.enunciado, p.explicacion, p.esPremium ? 1 : 0, p.orden],
        )
        const preguntaId = res.insertId
        for (const o of p.opciones || []) {
          await conn.execute(
            `INSERT INTO opciones (pregunta_id, texto, es_correcta, orden)
             VALUES (?, ?, ?, ?)`,
            [preguntaId, o.texto, o.esCorrecta ? 1 : 0, o.orden],
          )
        }
      }
    }

    // Planes
    for (const p of planesJson) {
      await conn.execute(
        `INSERT INTO planes (nombre, duracion_dias, activo) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE duracion_dias = VALUES(duracion_dias), activo = VALUES(activo)`,
        [p.nombre, p.duracionDias, p.activo ? 1 : 0],
      )
    }

    await conn.commit()

    // Conteos
    const tablas = ['regiones', 'categorias', 'fuentes', 'leyendas', 'leyenda_versiones', 'imagenes', 'audios', 'preguntas', 'opciones', 'planes']
    for (const t of tablas) {
      const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM ${t}`)
      console.log(`${t}: ${rows[0].n}`)
    }
    console.log('Seed cargado correctamente.')
  } catch (error) {
    await conn.rollback()
    console.error('Error al cargar el seed:', error.message || error.code || error)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

main().catch((error) => {
  console.error('Error al cargar el seed:', error.message || error.code || error)
  process.exit(1)
})
