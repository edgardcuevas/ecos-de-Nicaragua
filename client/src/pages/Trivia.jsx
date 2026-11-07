import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { post } from '../api.js'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import { BloqueoPremium, Cargando, ErrorCaja } from '../components/ui.jsx'

// El servidor devuelve estos códigos como texto de `mensaje`, así que se traducen aquí.
const MENSAJES = {
  TRIVIA_NO_DISPONIBLE: 'Esta leyenda todavía no tiene trivia.',
  RESPUESTAS_INCOMPLETAS: 'Faltan respuestas. Contesta todas las preguntas.',
  RESPUESTA_DUPLICADA: 'Hay una pregunta repetida en tus respuestas.',
  OPCION_INVALIDA: 'Una de las respuestas no es válida. Vuelve a intentarlo.',
  PREGUNTA_PREMIUM: 'Una de las preguntas es solo para premium.',
}

export default function Trivia() {
  const { slug } = useParams()
  const { premium, usuario } = useAuth()
  const { data: t, error, cargando, recargar } = useApi(`/trivia/${slug}`)
  useTitulo(t ? `Trivia: ${t.titulo}` : 'Trivia')

  const [paso, setPaso] = useState(0)
  const [resp, setResp] = useState({}) // preguntaId -> opcionId
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [falla, setFalla] = useState('')

  if (cargando && !t) return <Cargando />
  if (error?.status === 404)
    return (
      <div className="contenedor estado">
        <h1>Esta leyenda todavía no tiene trivia</h1>
        <Link className="btn btn--noche" to="/trivias">Ver trivias</Link>
      </div>
    )
  if (error) return <ErrorCaja error={{ message: MENSAJES[error.message] || error.message }} onReintentar={recargar} />
  if (!t) return null

  const total = t.preguntas.length
  const q = t.preguntas[paso]
  const reiniciar = () => {
    setPaso(0)
    setResp({})
    setResultado(null)
    setFalla('')
  }

  const enviar = async () => {
    setEnviando(true)
    setFalla('')
    try {
      const { data } = await post(`/trivia/${slug}/responder`, {
        respuestas: t.preguntas.map((p) => ({ preguntaId: p.id, opcionId: resp[p.id] })),
      })
      setResultado(data)
    } catch (e) {
      setFalla(MENSAJES[e.message] || e.message)
    } finally {
      setEnviando(false)
    }
  }

  const faltaPremium = !premium && t.totalPremium > 0

  if (resultado) {
    const porPregunta = new Map(resultado.detalle.map((d) => [d.preguntaId, d]))
    return (
      <div className="contenedor trivia">
        <div className="puntaje" aria-live="polite">
          <h1 style={{ fontSize: '1.4rem' }}>{t.titulo}</h1>
          <p className="puntaje__num">{resultado.puntaje} de {resultado.total}</p>
          <p>{resultado.puntaje === resultado.total ? '¡Respondiste todo bien!' : 'Revisa las respuestas para aprender más.'}</p>
        </div>
        <ol className="repaso">
          {t.preguntas.map((p) => {
            const d = porPregunta.get(p.id)
            const elegida = p.opciones.find((o) => o.id === d?.opcionId)
            const correcta = p.opciones.find((o) => o.id === d?.opcionCorrectaId)
            return (
              <li key={p.id} className={d?.correcta ? 'ok' : 'mal'}>
                <h3>{p.enunciado}</h3>
                <p className={d?.correcta ? 'resp-ok' : 'resp-mal'}>
                  {d?.correcta ? '✓ Correcta' : '✗ Incorrecta'}: {elegida?.texto}
                </p>
                {!d?.correcta && correcta && !d?.explicacion?.includes(correcta.texto) && <p><strong>Respuesta correcta:</strong> {correcta.texto}</p>}
                {d?.explicacion && <p>{d.explicacion}</p>}
              </li>
            )
          })}
        </ol>
        {faltaPremium && (
          <div style={{ marginBottom: '1.5rem' }}>
            <BloqueoPremium autenticado={!!usuario}>Hay {t.totalPremium} preguntas más de esta leyenda con premium.</BloqueoPremium>
          </div>
        )}
        <div className="fila-botones">
          <button type="button" className="btn btn--noche" onClick={reiniciar}>Repetir</button>
          <Link className="btn btn--borde sobre-papel" style={{ color: 'var(--noche)' }} to={`/leyendas/${slug}`}>Leer la leyenda</Link>
          <Link className="btn btn--borde sobre-papel" style={{ color: 'var(--noche)' }} to="/leyendas">Biblioteca</Link>
        </div>
      </div>
    )
  }

  const ultima = paso === total - 1
  return (
    <div className="contenedor trivia">
      <p style={{ margin: 0, color: 'var(--tinta-suave)' }}><Link to="/trivias">← Trivias</Link></p>
      <h1 style={{ fontSize: '1.4rem', marginTop: '0.75rem' }}>{t.titulo}</h1>
      <p style={{ margin: 0 }} aria-live="polite">Pregunta {paso + 1} de {total}</p>
      <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={paso} aria-label="Progreso"><i style={{ width: `${(paso / total) * 100}%` }} /></div>

      <fieldset className="opciones" key={q.id}>
        <legend className="pregunta">{q.enunciado}</legend>
        {q.opciones.map((o) => (
          <label key={o.id} className="opcion">
            <input type="radio" name={`p-${q.id}`} checked={resp[q.id] === o.id} onChange={() => setResp({ ...resp, [q.id]: o.id })} />
            <span>{o.texto}</span>
          </label>
        ))}
      </fieldset>

      {falla && <div className="aviso aviso--error" role="alert"><p>{falla}</p></div>}
      <div className="fila-botones">
        {paso > 0 && <button type="button" className="btn btn--borde sobre-papel" style={{ color: 'var(--noche)' }} onClick={() => setPaso(paso - 1)}>Anterior</button>}
        {ultima ? (
          <button type="button" className="btn btn--noche" disabled={!resp[q.id] || enviando} onClick={enviar}>{enviando ? 'Calificando…' : 'Ver mi puntaje'}</button>
        ) : (
          <button type="button" className="btn btn--noche" disabled={!resp[q.id]} onClick={() => setPaso(paso + 1)}>Siguiente</button>
        )}
      </div>
      {faltaPremium && <p style={{ marginTop: '1.5rem', color: 'var(--tinta-suave)', fontSize: '0.95rem' }}>Con la cuenta gratis juegas {t.totalGratis} de {t.totalGratis + t.totalPremium} preguntas. <Link to="/planes">Ver planes</Link></p>}
    </div>
  )
}
