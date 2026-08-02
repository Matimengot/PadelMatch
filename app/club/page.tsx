'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Club {
  id: string
  nombre: string
  direccion: string
}

interface Reserva {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  pagada: boolean
  canchas: { nombre: string; precio_hora: number }
  profiles: { nombre: string }
}

interface Stat {
  label: string
  value: string | number
  sub: string
}

interface Cancha {
  id: string
  nombre: string
  precio_hora: number
}

export default function ClubDashboardPage() {
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([])
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().toISOString().split('T')[0])
  const [canchas, setCanchas] = useState<Cancha[]>([])
  const [nuevaCanchaNombre, setNuevaCanchaNombre] = useState('')
  const [nuevaCanchaPrecio, setNuevaCanchaPrecio] = useState('')
  const [agregandoCancha, setAgregandoCancha] = useState(false)
  const [errorCancha, setErrorCancha] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clubData } = await supabase
        .from('clubes')
        .select('id, nombre, direccion')
        .eq('admin_id', user.id)
        .single()

      if (!clubData) { router.push('/club/registro'); return }
      setClub(clubData)

      const hoy = new Date().toISOString().split('T')[0]

      // Reservas del día seleccionado
      const { data: resHoy } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, pagada, canchas(nombre, precio_hora), profiles(nombre)')
        .eq('fecha', diaSeleccionado)
        .in('cancha_id', await getCanchaIds(clubData.id))
        .order('hora_inicio', { ascending: true })

      setReservasHoy(resHoy ?? [])

      // Próximas reservas (siguientes 7 días, sin contar hoy)
      const en7dias = new Date()
      en7dias.setDate(en7dias.getDate() + 7)
      const { data: resProximas } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, pagada, canchas(nombre, precio_hora), profiles(nombre)')
        .gt('fecha', hoy)
        .lte('fecha', en7dias.toISOString().split('T')[0])
        .in('cancha_id', await getCanchaIds(clubData.id))
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(10)

      setReservasProximas(resProximas ?? [])

      // Stats
      const { data: canchasData } = await supabase
        .from('canchas')
        .select('id, nombre, precio_hora')
        .eq('club_id', clubData.id)
        .order('nombre', { ascending: true })

      setCanchas(canchasData ?? [])

      const totalCanchas = canchasData?.length ?? 0
      const ingresosHoy = (resHoy ?? []).reduce((sum, r) => sum + (r.canchas?.precio_hora ?? 0), 0)
      const pendienteHoy = (resHoy ?? []).filter(r => !r.pagada).reduce((sum, r) => sum + (r.canchas?.precio_hora ?? 0), 0)

      setStats([
        { label: 'Reservas hoy', value: resHoy?.length ?? 0, sub: 'turnos confirmados' },
        { label: 'Ingresos hoy', value: `$${ingresosHoy.toLocaleString()}`, sub: totalCanchas + ' cancha' + (totalCanchas === 1 ? '' : 's') },
        { label: 'Pendiente de cobro', value: `$${pendienteHoy.toLocaleString()}`, sub: 'hoy' },
        { label: 'Próximos 7 días', value: resProximas?.length ?? 0, sub: 'reservas' },
      ])

      setLoading(false)
    }
    load()
  }, [router, diaSeleccionado])

  async function getCanchaIds(clubId: string): Promise<string[]> {
    const { data } = await supabase
      .from('canchas')
      .select('id')
      .eq('club_id', clubId)
    return (data ?? []).map(c => c.id)
  }

  async function recargarCanchas() {
    if (!club) return
    const { data } = await supabase
      .from('canchas')
      .select('id, nombre, precio_hora')
      .eq('club_id', club.id)
      .order('nombre', { ascending: true })
    setCanchas(data ?? [])
  }

  async function agregarCancha(e: React.FormEvent) {
    e.preventDefault()
    if (!club) return
    setErrorCancha('')
    setAgregandoCancha(true)

    const { error } = await supabase.from('canchas').insert({
      club_id: club.id,
      nombre: nuevaCanchaNombre.trim(),
      precio_hora: parseFloat(nuevaCanchaPrecio) || 0,
    })

    if (error) {
      setErrorCancha(error.message)
    } else {
      setNuevaCanchaNombre('')
      setNuevaCanchaPrecio('')
      await recargarCanchas()
    }
    setAgregandoCancha(false)
  }

  function empezarEdicion(cancha: Cancha) {
    setEditandoId(cancha.id)
    setEditNombre(cancha.nombre)
    setEditPrecio(String(cancha.precio_hora))
  }

  async function guardarEdicion(id: string) {
    setErrorCancha('')
    const { error } = await supabase
      .from('canchas')
      .update({ nombre: editNombre.trim(), precio_hora: parseFloat(editPrecio) || 0 })
      .eq('id', id)

    if (error) {
      setErrorCancha(error.message)
      return
    }
    setEditandoId(null)
    await recargarCanchas()
  }

  async function eliminarCancha(id: string) {
    setErrorCancha('')
    const hoy = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('cancha_id', id)
      .gte('fecha', hoy)

    if (count && count > 0) {
      setErrorCancha('No se puede eliminar: tiene reservas futuras. Cancelalas primero.')
      return
    }

    const { error } = await supabase.from('canchas').delete().eq('id', id)
    if (error) {
      setErrorCancha(error.message)
      return
    }
    await recargarCanchas()
  }

  async function togglePagada(id: string, actual: boolean) {
    const { error } = await supabase
      .from('reservas')
      .update({ pagada: !actual })
      .eq('id', id)

    if (error) return

    const nuevasHoy = reservasHoy.map(r => r.id === id ? { ...r, pagada: !actual } : r)
    setReservasHoy(nuevasHoy)
    setReservasProximas(prev => prev.map(r => r.id === id ? { ...r, pagada: !actual } : r))

    const pendienteHoy = nuevasHoy.filter(r => !r.pagada).reduce((sum, r) => sum + (r.canchas?.precio_hora ?? 0), 0)
    setStats(prev => prev.map(s => s.label === 'Pendiente de cobro' ? { ...s, value: `$${pendienteHoy.toLocaleString()}` } : s))
  }

  function formatFecha(fecha: string) {
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando panel...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-green-600">PadelMatch</span>
          <span className="ml-3 text-sm text-gray-400 font-medium">Panel del club</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-gray-700 font-medium">{club?.nombre}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-sm">Salir</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{club?.nombre}</h1>
          <p className="text-gray-400 mt-1">📍 {club?.direccion}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Reservas del día */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Reservas del día</h2>
            <input
              type="date"
              value={diaSeleccionado}
              onChange={e => setDiaSeleccionado(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {reservasHoy.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay reservas para este día</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reservasHoy.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 text-green-700 font-bold text-sm px-3 py-2 rounded-xl min-w-[80px] text-center">
                      {r.hora_inicio.slice(0, 5)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.profiles?.nombre}</p>
                      <p className="text-sm text-gray-400">{r.canchas?.nombre} · hasta {r.hora_fin.slice(0, 5)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePagada(r.id, r.pagada)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      r.pagada
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    {r.pagada ? 'Pagada' : 'Pendiente de cobro'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gestión de canchas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Canchas</h2>

          {errorCancha && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
              {errorCancha}
            </div>
          )}

          <div className="flex flex-col gap-3 mb-6">
            {canchas.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-4 border border-gray-100 rounded-xl px-4 py-3">
                {editandoId === c.id ? (
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="text"
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          value={editPrecio}
                          onChange={e => setEditPrecio(e.target.value)}
                          className="border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => guardarEdicion(c.id)} className="text-green-600 hover:text-green-700 text-sm font-semibold">
                        Guardar
                      </button>
                      <button onClick={() => setEditandoId(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="font-semibold text-gray-900">{c.nombre}</p>
                      <p className="text-sm text-gray-400">${c.precio_hora} / 90 min</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => empezarEdicion(c)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">
                        Editar
                      </button>
                      <button onClick={() => eliminarCancha(c.id)} className="text-red-400 hover:text-red-600 text-sm font-medium">
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={agregarCancha} className="flex items-end gap-3 border-t border-gray-100 pt-6">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nueva cancha</label>
              <input
                type="text"
                value={nuevaCanchaNombre}
                onChange={e => setNuevaCanchaNombre(e.target.value)}
                placeholder="Ej: Cancha 3"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Precio / hora</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={nuevaCanchaPrecio}
                  onChange={e => setNuevaCanchaPrecio(e.target.value)}
                  placeholder="0"
                  required
                  className="border border-gray-200 rounded-lg pl-6 pr-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={agregandoCancha}
              className="bg-green-600 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {agregandoCancha ? 'Agregando...' : 'Agregar'}
            </button>
          </form>
        </div>

        {/* Próximas reservas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Próximos 7 días</h2>

          {reservasProximas.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay reservas en los próximos 7 días</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reservasProximas.map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-100 text-gray-600 font-bold text-xs px-3 py-2 rounded-xl min-w-[90px] text-center">
                      {formatFecha(r.fecha)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{r.profiles?.nombre}</p>
                      <p className="text-sm text-gray-400">{r.canchas?.nombre} · {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePagada(r.id, r.pagada)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      r.pagada
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                    }`}
                  >
                    {r.pagada ? 'Pagada' : 'Pendiente de cobro'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
