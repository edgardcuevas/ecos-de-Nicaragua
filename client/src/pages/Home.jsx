import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, useTitulo } from '../hooks.js'
import { useAuth } from '../auth.jsx'
import LegendCard from '../components/LegendCard.jsx'
import { Cargando, ErrorCaja, ImagenLeyenda } from '../components/ui.jsx'

function Visor({ leyendas }) {
  const [i, setI] = useState(0)
  const [clave, setClave] = useState(0)
  const actual = leyendas[i]
  const elegir = (n) => {
    setI(n)
    setClave((k) => k + 1)
  }
  return (
    <figure className="visor">
      <div className="lamina">
        <div key={clave} className="entra" style={{ borderRadius: 2, overflow: 'hidden' }}>
          <ImagenLeyenda className="lamina__img" slug={actual.slug} imagen={actual.imagenPrincipal} alt={`Lámina de ${actual.titulo}`} eager />
        </div>
      </div>
      <figcaption className="visor__pie">
        <h2 className="visor__titulo">{actual.titulo}</h2>
        <Link className="visor__enlace" to={`/leyendas/${actual.slug}`}>
          Leer la leyenda
        </Link>
      </figcaption>
      <ul className="visor__miniaturas" aria-label="Elegir lámina">
        {leyendas.map((l, n) => (
          <li key={l.slug}>
            <button type="button" className="miniatura" aria-current={n === i} aria-label={l.titulo} onClick={() => elegir(n)}>
              <ImagenLeyenda slug={l.slug} imagen={l.imagenPrincipal} alt="" />
            </button>
          </li>
        ))}
      </ul>
    </figure>
  )
}

export default function Home() {
  useTitulo('')
  const { premium } = useAuth()
  const { data, error, cargando, recargar } = useApi('/leyendas', { limit: 50 })

  return (
    <>
      <section className="hero">
        <div className="contenedor hero__rejilla">
          <div className="hero__texto">
            <h1>Las leyendas cobran vida</h1>
            <p>Explora La Mocuana, El Cadejo, La Cegua y otras leyendas nicaragüenses: lee su historia, ubícalas en el mapa, escúchalas y ponte a prueba.</p>
            <div className="fila-botones">
              <Link to="/leyendas" className="btn btn--luna">
                Explorar leyendas
              </Link>
              <Link to="/mapa" className="btn btn--borde">
                Ver el mapa
              </Link>
            </div>
          </div>
          {data?.length ? <Visor leyendas={data} /> : <div className="esqueleto" style={{ aspectRatio: '16/10' }} aria-hidden="true" />}
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <h2>Biblioteca de leyendas</h2>
          {cargando && <Cargando />}
          {error && <ErrorCaja error={error} onReintentar={recargar} />}
          {data && (
            <div className="rejilla">
              {data.map((l) => (
                <LegendCard key={l.slug} leyenda={l} premium={premium} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="seccion papel" style={{ paddingTop: '3rem' }}>
        <div className="contenedor">
          <h2>Aprende jugando</h2>
          <div className="atajos">
            <Link to="/mapa" className="atajo">
              <h3>Mapa</h3>
              <p>Toca un departamento y mira qué leyendas se cuentan allí, con su fuente.</p>
            </Link>
            <Link to="/trivias" className="atajo">
              <h3>Trivias</h3>
              <p>Cinco preguntas por leyenda, con explicación al terminar.</p>
            </Link>
            <Link to="/ubica" className="atajo">
              <h3>Ubica la leyenda</h3>
              <p>Lleva cada leyenda al lugar donde está documentada.</p>
            </Link>
          </div>
        </div>
      </section>

      {!premium && (
        <section className="banda seccion" style={{ paddingBlock: '2.5rem' }}>
          <div className="contenedor">
            <div>
              <h2 style={{ marginBottom: '0.3em' }}>Escucha las narraciones</h2>
              <p>Con premium accedes a las narraciones en audio, las versiones ampliadas, todas las ilustraciones y las cinco preguntas de cada trivia.</p>
            </div>
            <Link to="/planes" className="btn btn--luna">
              Ver planes
            </Link>
          </div>
        </section>
      )}
    </>
  )
}
