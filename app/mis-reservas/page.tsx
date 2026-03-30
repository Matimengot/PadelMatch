'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Reserva {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  canchas: { nombre: string; clubes: { nombre: string; direccion: string } }
}

export default function MisReservasPage() {
  const router = useRouter()
  const [proximas, setProximas] = useState<Reserva[]>([])
  const [pasadas, setPasadas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const hoy = new Date().toISOString().split('T')[0]

      const { data: prox } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, canchas(nombre, clubes(nombre, direccion))')
        .eq('jugador_id', user.id)
        .gte('fecha', hoy)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })

      const { data: past } = await supabase
        .from('reservas')
        .select('id, fecha, hora_inicio, hora_fin, canchas(nombre, clubes(nombre, direccion))')
        .eq('jugador_id', user.id)
        .lt('fecha', hoy)
        .order('fecha', { ascending: false })
        .limit(5)

      setProximas(prox ?? [])
      setPasadas(past ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  function formatFecha(fecha: string) {
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando reservas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-gray-600 hover:text-gray-900 font-medium">Canchas</a>
          <a href="/partidos" className="text-gray-600 hover:text-gray-900 font-medium">Partidos</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis reservas</h1>

        {/* Próximas */}
        <h2 className="text-lg font-bold text-gray-700 mb-4">Próximas</h2>
        {proximas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-8">
            <p className="text-4xl mb-3">🎾</p>
            <p className="text-gray-400">No tenés reservas próximas</p>
            <a href="/canchas" className="mt-3 inline-block text-green-600 font-semibold hover:underline">
              Reservar una cancha
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-8">
            {proximas.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 capitalize">{formatFecha(r.fecha)}</p>
                    <p className="text-green-600 font-semibold mt-1">
                      {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      🎾 {r.canchas?.nombre} · {r.canchas?.clubes?.nombre}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      📍 {r.canchas?.clubes?.direccion}
                    </p>
                  </div>
                  <span className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                    Confirmada
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pasadas */}
        {pasadas.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-700 mb-4">Historial</h2>
            <div className="flex flex-col gap-3">
              {pasadas.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5 opacity-60">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 capitalize">{formatFecha(r.fecha)}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        {r.hora_inicio.slice(0, 5)} – {r.hora_fin.slice(0, 5)} · {r.canchas?.nombre} · {r.canchas?.clubes?.nombre}
                      </p>
                    </div>
                    <span className="bg-gray-100 text-gray-400 text-xs font-semibold px-3 py-1 rounded-full">
                      Jugada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
