import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { Luna } from './ui.jsx'

export default function Layout() {
  const { usuario, esAdmin, premium, salir, cargando } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  const navegar = useNavigate()

  useEffect(() => {
    setAbierto(false)
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div id="raiz-app">
      <a href="#contenido" className="saltar">
        Saltar al contenido
      </a>
      <header className="cabecera">
        <div className="contenedor cabecera__fila">
          <Link to="/" className="marca">
            <Luna /> Ecos de Nicaragua
          </Link>
          <button type="button" className="menu-boton" aria-expanded={abierto} aria-controls="nav-principal" onClick={() => setAbierto((v) => !v)}>
            <span className="solo-lectores">{abierto ? 'Cerrar menú' : 'Abrir menú'}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {abierto ? <path d="M5 5l14 14M19 5L5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
          <nav id="nav-principal" aria-label="Principal" className={`nav ${abierto ? 'nav--abierto' : ''}`}>
            <NavLink to="/leyendas">Leyendas</NavLink>
            <NavLink to="/mapa">Mapa</NavLink>
            <NavLink to="/trivias">Trivias</NavLink>
            <NavLink to="/runner">Juego</NavLink>
            <NavLink to="/ubica">Ubica la leyenda</NavLink>
            <NavLink to="/planes">Planes</NavLink>
            {esAdmin && <NavLink to="/admin">Administración</NavLink>}
            {!cargando &&
              (usuario ? (
                <>
                  <NavLink to="/cuenta" className="nav__cuenta">
                    {usuario.nombreUsuario}
                    {premium ? ' (premium)' : ''}
                  </NavLink>
                  <button
                    type="button"
                    onClick={async () => {
                      await salir()
                      navegar('/')
                    }}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <NavLink to="/ingresar" className="nav__cuenta">
                  Ingresar
                </NavLink>
              ))}
          </nav>
        </div>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="pie">
        <div className="contenedor pie__fila">
          <div>
            <strong>Ecos de Nicaragua</strong>
            <p>Las leyendas cobran vida. Las leyendas se transmiten oralmente y existen muchas versiones: aquí mostramos la fuente y el nivel de verificación de cada lugar asociado.</p>
          </div>
          <div>
            <p>
              Límites del mapa: <a href="https://www.geoboundaries.org" target="_blank" rel="noreferrer">geoBoundaries</a> (Runfola et al., 2020), licencia{' '}
              <a href="https://creativecommons.org/licenses/by/4.0/deed.es" target="_blank" rel="noreferrer">CC BY 4.0</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
