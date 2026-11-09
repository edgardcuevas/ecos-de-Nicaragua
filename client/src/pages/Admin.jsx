import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { del, get, mensajeError, patch, post } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useApi, useTitulo } from '../hooks.js'
import { Cargando } from '../components/ui.jsx'

const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

function Paginacion({ meta, onPagina }) {
  if (!meta || meta.totalPaginas <= 1) return null
  return (
    <div className="paginacion">
      <button type="button" className="btn btn--borde btn--chico" disabled={meta.page <= 1} onClick={() => onPagina(meta.page - 1)}>Anterior</button>
      <span>Página {meta.page} de {meta.totalPaginas}</span>
      <button type="button" className="btn btn--borde btn--chico" disabled={meta.page >= meta.totalPaginas} onClick={() => onPagina(meta.page + 1)}>Siguiente</button>
    </div>
  )
}

// Carga una lista paginada del panel. `recargar` vuelve a pedirla tras una acción.
function useLista(ruta, filtros, pagina) {
  const [estado, setEstado] = useState({ data: null, meta: null, error: null, cargando: true })
  const [n, setN] = useState(0)
  const clave = JSON.stringify(filtros)
  useEffect(() => {
    const ctrl = new AbortController()
    setEstado((s) => ({ ...s, cargando: true, error: null }))
    get(ruta, { ...filtros, page: pagina, limit: 15 }, ctrl.signal)
      .then((j) => setEstado({ data: j.data, meta: j.meta, error: null, cargando: false }))
      .catch((e) => e.name !== 'AbortError' && setEstado({ data: null, meta: null, error: e, cargando: false }))
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, clave, pagina, n])
  return { ...estado, recargar: useCallback(() => setN((v) => v + 1), []) }
}

function Mensaje({ m }) {
  if (!m) return null
  return <div className={`aviso ${m.tipo === 'error' ? 'aviso--error' : 'aviso--ok'}`} role={m.tipo === 'error' ? 'alert' : 'status'}><p>{m.texto}</p></div>
}

/* ---------- Usuarios ---------- */
function ModalSuscripcion({ usuario, planes, onCerrar, onHecho }) {
  const [planId, setPlanId] = useState(planes[0]?.id ?? '')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const body = { planId: Number(planId) }
      if (inicio) body.fechaInicio = inicio
      if (fin) body.fechaFin = fin
      await post(`/admin/usuarios/${usuario.id}/suscripcion`, body)
      onHecho(`Premium activado para ${usuario.nombreUsuario}.`)
    } catch (err) {
      setError(mensajeError(err))
      setEnviando(false)
    }
  }
  return (
    <div className="modal-fondo" role="presentation" onClick={onCerrar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="m-tit" onClick={(e) => e.stopPropagation()}>
        <h2 id="m-tit" style={{ fontSize: '1.3rem' }}>Activar premium</h2>
        <p>Usuario: <strong>{usuario.nombreUsuario}</strong>. Reemplaza la suscripción vigente, si la hay.</p>
        {error && <div className="aviso aviso--error" role="alert"><p>{error}</p></div>}
        <form className="form" style={{ maxWidth: 'none' }} onSubmit={enviar}>
          <div className="campo"><label htmlFor="plan">Plan</label>
            <select id="plan" className="select" style={{ width: '100%' }} value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select></div>
          <div className="campo"><label htmlFor="ini">Inicio (opcional)</label><input id="ini" className="input" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /><small>Si lo dejas vacío, empieza hoy.</small></div>
          <div className="campo"><label htmlFor="fin">Fin (opcional)</label><input id="fin" className="input" type="date" value={fin} onChange={(e) => setFin(e.target.value)} /><small>Si lo dejas vacío, se calcula según el plan.</small></div>
          <div className="fila-botones">
            <button className="btn btn--noche" type="submit" disabled={enviando || !planId}>{enviando ? 'Activando…' : 'Activar premium'}</button>
            <button className="btn btn--borde" type="button" onClick={onCerrar}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Usuarios({ planes, miId }) {
  const [filtros, setFiltros] = useState({ q: '', rol: '', premium: '' })
  const [aplicados, setAplicados] = useState(filtros)
  const [pagina, setPagina] = useState(1)
  const { data, meta, error, cargando, recargar } = useLista('/admin/usuarios', aplicados, pagina)
  const [msg, setMsg] = useState(null)
  const [modal, setModal] = useState(null)

  const accion = async (fn, texto) => {
    setMsg(null)
    try {
      await fn()
      setMsg({ tipo: 'ok', texto })
      recargar()
    } catch (e) {
      setMsg({ tipo: 'error', texto: mensajeError(e) })
    }
  }

  return (
    <section aria-labelledby="t-usuarios">
      <h2 id="t-usuarios" className="solo-lectores">Usuarios</h2>
      <form className="filtros--admin" onSubmit={(e) => { e.preventDefault(); setPagina(1); setAplicados(filtros) }}>
        <div className="campo"><label htmlFor="f-q">Buscar</label><input id="f-q" className="input" value={filtros.q} onChange={(e) => setFiltros({ ...filtros, q: e.target.value })} placeholder="Correo o usuario" /></div>
        <div className="campo"><label htmlFor="f-rol">Rol</label>
          <select id="f-rol" className="select" value={filtros.rol} onChange={(e) => setFiltros({ ...filtros, rol: e.target.value })}>
            <option value="">Todos</option><option value="gratis">Gratis</option><option value="premium">Premium</option><option value="admin">Admin</option>
          </select></div>
        <div className="campo"><label htmlFor="f-p">Suscripción</label>
          <select id="f-p" className="select" value={filtros.premium} onChange={(e) => setFiltros({ ...filtros, premium: e.target.value })}>
            <option value="">Todas</option><option value="true">Con premium vigente</option><option value="false">Sin premium</option>
          </select></div>
        <button className="btn btn--noche" type="submit">Filtrar</button>
      </form>
      <Mensaje m={msg} />
      {cargando && !data && <Cargando />}
      {error && <div className="aviso aviso--error" role="alert"><p>{error.message}</p></div>}
      {data && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th scope="col">Usuario</th><th scope="col">Correo</th><th scope="col">Rol</th><th scope="col">Premium hasta</th><th scope="col">Acciones</th></tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan="5">No hay usuarios con ese filtro.</td></tr>}
              {data.map((u) => (
                <tr key={u.id}>
                  <td>{u.nombreUsuario}</td>
                  <td>{u.correo}</td>
                  <td>
                    <label className="solo-lectores" htmlFor={`rol-${u.id}`}>Rol de {u.nombreUsuario}</label>
                    <select id={`rol-${u.id}`} className="select" style={{ minWidth: 0 }} value={u.rol} disabled={u.id === miId}
                      onChange={(e) => accion(() => patch(`/admin/usuarios/${u.id}/rol`, { rol: e.target.value }), `Rol de ${u.nombreUsuario} actualizado.`)}>
                      <option value="gratis">Gratis</option><option value="premium">Premium</option><option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>{u.suscripcionActual ? `${u.suscripcionActual.fechaFin} (${u.suscripcionActual.plan})` : '—'}</td>
                  <td>
                    <div className="acciones">
                      <button type="button" className="btn btn--noche btn--chico" onClick={() => setModal(u)}>Activar premium</button>
                      {u.suscripcionActual && (
                        <button type="button" className="btn btn--peligro btn--chico"
                          onClick={() => window.confirm(`¿Quitar el premium a ${u.nombreUsuario}?`) && accion(() => del(`/admin/usuarios/${u.id}/suscripcion`), `Premium quitado a ${u.nombreUsuario}.`)}>
                          Quitar premium
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion meta={meta} onPagina={setPagina} />
      {modal && <ModalSuscripcion usuario={modal} planes={planes} onCerrar={() => setModal(null)} onHecho={(t) => { setModal(null); setMsg({ tipo: 'ok', texto: t }); recargar() }} />}
    </section>
  )
}

/* ---------- Códigos ---------- */
function Codigos({ planes }) {
  const [planId, setPlanId] = useState(planes[0]?.id ?? '')
  const [cantidad, setCantidad] = useState(1)
  const [vence, setVence] = useState('')
  const [msg, setMsg] = useState(null)
  const [nuevos, setNuevos] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [usado, setUsado] = useState('')
  const [pagina, setPagina] = useState(1)
  const { data, meta, error, cargando, recargar } = useLista('/admin/codigos', { usado: usado }, pagina)

  const generar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setMsg(null)
    try {
      // El código vence al final del día elegido, en la hora local.
      const fechaVencimiento = new Date(`${vence}T23:59:59`).toISOString()
      const { data: r } = await post('/admin/codigos', { planId: Number(planId), cantidad: Number(cantidad), fechaVencimiento })
      setNuevos(r.codigos)
      recargar()
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeError(err) })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section aria-labelledby="t-codigos">
      <h2 id="t-codigos" style={{ fontSize: '1.3rem' }}>Generar códigos</h2>
      <form className="filtros--admin" onSubmit={generar}>
        <div className="campo"><label htmlFor="c-plan">Plan</label>
          <select id="c-plan" className="select" value={planId} onChange={(e) => setPlanId(e.target.value)}>{planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
        <div className="campo"><label htmlFor="c-cant">Cantidad (1 a 100)</label><input id="c-cant" className="input" type="number" min="1" max="100" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></div>
        <div className="campo"><label htmlFor="c-vence">Se puede canjear hasta</label><input id="c-vence" className="input" type="date" required value={vence} onChange={(e) => setVence(e.target.value)} /></div>
        <button className="btn btn--noche" type="submit" disabled={enviando || !vence || !planId}>{enviando ? 'Generando…' : 'Generar códigos'}</button>
      </form>
      <Mensaje m={msg} />
      {nuevos && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p><strong>Cópialos ahora:</strong> por seguridad no se vuelven a mostrar.</p>
          <div className="codigos-nuevos" tabIndex={0}>{nuevos.join('\n')}</div>
          <p style={{ marginTop: '0.5rem' }}><button type="button" className="btn btn--borde btn--chico" onClick={() => navigator.clipboard?.writeText(nuevos.join('\n'))}>Copiar al portapapeles</button></p>
        </div>
      )}

      <h2 style={{ fontSize: '1.3rem', marginTop: '2rem' }}>Códigos creados</h2>
      <div className="filtros--admin">
        <div className="campo"><label htmlFor="c-usado">Mostrar</label>
          <select id="c-usado" className="select" value={usado} onChange={(e) => { setPagina(1); setUsado(e.target.value) }}>
            <option value="">Todos</option><option value="false">Sin usar</option><option value="true">Usados</option>
          </select></div>
      </div>
      {cargando && !data && <Cargando />}
      {error && <div className="aviso aviso--error" role="alert"><p>{error.message}</p></div>}
      {data && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th scope="col">Plan</th><th scope="col">Canjeable hasta</th><th scope="col">Estado</th><th scope="col">Creado</th></tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan="4">Todavía no hay códigos.</td></tr>}
              {data.map((c) => (
                <tr key={c.id}>
                  <td>{c.plan?.nombre}</td>
                  <td>{fechaHora(c.fechaVencimiento)}</td>
                  <td>{c.usadoPor ? `Usado por ${c.usadoPor.nombreUsuario} (${fechaHora(c.usadoEn)})` : 'Sin usar'}</td>
                  <td>{fechaHora(c.creadoEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion meta={meta} onPagina={setPagina} />
    </section>
  )
}

/* ---------- Auditoría ---------- */
function Auditoria() {
  const [pagina, setPagina] = useState(1)
  const { data, meta, error, cargando } = useLista('/admin/auditoria', {}, pagina)
  return (
    <section aria-labelledby="t-aud">
      <h2 id="t-aud" className="solo-lectores">Auditoría</h2>
      {cargando && !data && <Cargando />}
      {error && <div className="aviso aviso--error" role="alert"><p>{error.message}</p></div>}
      {data && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th scope="col">Fecha</th><th scope="col">Acción</th><th scope="col">Entidad</th><th scope="col">Admin</th></tr></thead>
            <tbody>
              {data.length === 0 && <tr><td colSpan="4">Sin movimientos todavía.</td></tr>}
              {data.map((a) => (
                <tr key={a.id}>
                  <td>{fechaHora(a.creadoEn || a.creado_en || a.fecha)}</td>
                  <td>{a.accion}</td>
                  <td>{a.entidad}{a.entidadId ? ` #${a.entidadId}` : ''}</td>
                  <td>{a.admin?.nombreUsuario || a.adminId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Paginacion meta={meta} onPagina={setPagina} />
    </section>
  )
}

export default function Admin() {
  useTitulo('Administración')
  const { usuario, esAdmin, cargando } = useAuth()
  const [tab, setTab] = useState('usuarios')
  const planes = useApi('/premium/planes')
  if (cargando) return <div className="noche-pagina"><Cargando /></div>
  if (!usuario) return <Navigate to="/ingresar" replace state={{ desde: '/admin' }} />
  if (!esAdmin)
    return (
      <div className="noche-pagina"><div className="contenedor estado" style={{ paddingBlock: '4rem' }}>
        <h1>No tienes permiso para ver esta página</h1>
        <p>Solo las cuentas de administración pueden entrar aquí.</p>
      </div></div>
    )
  const lista = planes.data || []
  return (
    <div className="noche-pagina">
      <div className="titulo-pagina"><div className="contenedor"><h1>Administración</h1><p>Usuarios, premium y códigos de activación.</p></div></div>
      <div className="contenedor seccion" style={{ paddingTop: '1.5rem' }}>
        <div className="pestanas" role="tablist" aria-label="Secciones">
          {[['usuarios', 'Usuarios'], ['codigos', 'Códigos'], ['auditoria', 'Auditoría']].map(([id, t]) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} className="pestana" onClick={() => setTab(id)}>{t}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'usuarios' && <Usuarios planes={lista} miId={usuario.id} />}
          {tab === 'codigos' && <Codigos planes={lista} />}
          {tab === 'auditoria' && <Auditoria />}
        </div>
      </div>
    </div>
  )
}
