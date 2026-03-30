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
  canchas: { nombre: string }
  profiles: { nombre: string }
}

interface Stat {
  label: string
  value: string | number
  sub: string
}

export default function ClubDashboardPage() {
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [reservasHoy, setReservasHoy] = useState<Reserva[]>([])
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])
  const [stats, setStats] = useState<Stat[]>([])
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clubData } = await supabase
        .from('clubes')
        .select('id, nombre, direccion')
        .eq('admin_id', user.id)
        .single()

      if (!clubData) { router.push('/dashboard'); return }
      setClub(clubData)

      const hoy = new Date().toISOString().split('T')[0]

      // Reservas del día seleccionado
      const { data: resHoy } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, canchas(nombre), profiles(nombre)')
        .eq('fecha', diaSeleccionado)
        .in('cancha_id', await getCanchaIds(clubData.id))
        .order('hora_inicio', { ascending: true })

      setReservasHoy(resHoy ?? [])

      // Próximas reservas (siguientes 7 días, sin contar hoy)
      const en7dias = new Date()
      en7dias.setDate(en7dias.getDate() + 7)
      const { data: resProximas } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, canchas(nombre), profiles(nombre)')
        .gt('fecha', hoy)
        .lte('fecha', en7dias.toISOString().split('T')[0])
        .in('cancha_id', await getCanchaIds(clubData.id))
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(10)

      setReservasProximas(resProximas ?? [])

      // Stats
      const { data: canchas } = await supabase
        .from('canchas')
        .select('id, precio_hora')
        .eq('club_id', clubData.id)

      const totalCanchas = canchas?.length ?? 0
      const ingresosHoy = (resHoy?.length ?? 0) * (canchas?.[0]?.precio_hora ?? 0)

      setStats([
        { label: 'Reservas hoy', value: resHoy?.length ?? 0, sub: 'turnos confirmados' },
        { label: 'Canchas', value: totalCanchas, sub: 'en total' },
        { label: 'Ingresos hoy', value: `$${ingresosHoy.toLocaleString()}`, sub: 'estimado' },
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
                  <span className="text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full">
                    Confirmada
                  </span>
                </div>
              ))}
            </div>
          )}
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
                  <span className="text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full">
                    Confirmada
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
