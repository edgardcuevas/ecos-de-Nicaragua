import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import LegendCard from '../components/LegendCard.jsx'
import { Cargando, ErrorCaja, ImagenLeyenda } from '../components/ui.jsx'

// La ilustración queda en penumbra y un farol de luz sigue al cursor (o al dedo).
function Visor({ leyendas }) {
  const [i, setI] = useState(0)
  const [clave, setClave] = useState(0)
  const marco = useRef(null)
  const actual = leyendas[i]

  const elegir = (n) => {
    setI(n)
    setClave((k) => k + 1)
  }
  const mover = (e) => {
    const el = marco.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--x', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
    el.style.setProperty('--y', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
  }
  const soltar = () => {
    marco.current?.style.removeProperty('--x')
    marco.current?.style.removeProperty('--y')
  }

  return (
    <figure className="inicio-lamina">
      <div ref={marco} className="inicio-lamina__marco" onPointerMove={mover} onPointerLeave={soltar}>
        <div key={clave} className="entra">
          <ImagenLeyenda slug={actual.slug} imagen={actual.imagenPrincipal} alt={`Lámina de ${actual.titulo}`} eager />
        </div>
      </div>
      <figcaption className="inicio-lamina__pie">
        <h2 className="inicio-lamina__titulo">{actual.titulo}</h2>
        <Link className="inicio-lamina__enlace" to={`/leyendas/${actual.slug}`}>
          Leer la leyenda
        </Link>
      </figcaption>
      <ul className="inicio-lamina__tira" aria-label="Elegir lámina">
        {leyendas.map((l, n) => (
          <li key={l.slug}>
            <button type="button" className="inicio-miniatura" aria-current={n === i} aria-label={l.titulo} onClick={() => elegir(n)}>
              <ImagenLeyenda slug={l.slug} imagen={l.imagenPrincipal} alt="" />
            </button>
          </li>
        ))}
      </ul>
    </figure>
  )
}

const ATAJOS = [
  { to: '/mapa', titulo: 'Mapa', texto: 'Toca un departamento y mira qué leyendas se cuentan allí, con su fuente.' },
  { to: '/trivias', titulo: 'Trivias', texto: 'Cinco preguntas por leyenda, con explicación al terminar.' },
  { to: '/ubica', titulo: 'Ubica la leyenda', texto: 'Lleva cada leyenda al lugar donde está documentada.' },
  { to: '/runner', titulo: 'Huir de las Ceguas', texto: 'Corre de noche, salta los obstáculos y no dejes que las Ceguas te alcancen.' },
  { to: '/padre-sin-cabeza', titulo: 'El Padre sin Cabeza', texto: 'Recorre el pueblo a oscuras hasta que cante el gallo. Cuidado con el perro y la campana.' },
]

export default function Home() {
  useTitulo('')
  const { premium } = useAuth()
  const { data, error, cargando, recargar } = useApi('/leyendas', { limit: 50 })

  return (
    <div className="inicio">
      <section className="inicio-hero">
        <div className="contenedor inicio-hero__rejilla">
          <div className="inicio-hero__texto">
            <h1>Las leyendas cobran vida</h1>
            <p>Lee La Mocuana, El Cadejo, La Cegua y otras leyendas nicaragüenses. Ubícalas en el mapa, escúchalas y ponte a prueba.</p>
            <div className="fila-botones">
              <Link to="/leyendas" className="btn btn--luna">
                Explorar leyendas
              </Link>
              <Link to="/mapa" className="btn btn--borde">
                Ver el mapa
              </Link>
            </div>
          </div>
          {data?.length ? <Visor leyendas={data} /> : <div className="esqueleto" style={{ aspectRatio: '16/10', opacity: 0.15 }} aria-hidden="true" />}
        </div>
      </section>

      <section className="inicio-seccion">
        <div className="contenedor">
          <h2>Biblioteca de leyendas</h2>
          <p className="inicio-seccion__intro">Cada leyenda tiene varias versiones. Aquí ves de dónde viene cada una y qué tan verificada está.</p>
          {cargando && <Cargando />}
          {error && <ErrorCaja error={error} onReintentar={recargar} />}
          {data && (
            <div className="rejilla">
              {data.map((l) => (
                <LegendCard key={l.slug} leyenda={l} premium={premium} variante="cartel" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="inicio-seccion">
        <div className="contenedor">
          <h2>Aprende jugando</h2>
          <ul className="inicio-atajos">
            {ATAJOS.map((a) => (
              <li key={a.to}>
                <Link to={a.to}>
                  <h3>{a.titulo}</h3>
                  <p>{a.texto}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {!premium && (
        <section className="inicio-premium">
          <div className="contenedor">
            <div>
              <h2>Escucha las narraciones</h2>
              <p>Con premium accedes a las narraciones en audio, las versiones ampliadas, todas las ilustraciones y las cinco preguntas de cada trivia.</p>
            </div>
            <Link to="/planes" className="btn btn--luna">
              Ver planes
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
