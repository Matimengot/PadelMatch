'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Partido {
  id: string
  fecha: string
  hora_inicio: string
  tipo: string
  estado: string
  sets: string | null
  jugadores_confirmados: number
  canchas: { nombre: string; clubes: { nombre: string } }
}

interface Resultado {
  partido_id: string
  resultado: string
  sets: string | null
}

export default function MisPartidosPage() {
  const router = useRouter()
  const [proximos, setProximos] = useState<Partido[]>([])
  const [pasados, setPasados] = useState<Partido[]>([])
  const [resultados, setResultados] = useState<Map<string, Resultado>>(new Map())
  const [jugadoresPorPartido, setJugadoresPorPartido] = useState<Map<string, string[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const hoy = new Date().toISOString().split('T')[0]

      const { data: misP } = await supabase
        .from('partido_jugadores')
        .select('partido_id')
        .eq('jugador_id', user.id)

      const ids = (misP ?? []).map(p => p.partido_id)
      if (ids.length === 0) { setLoading(false); return }

      const [{ data: prox }, { data: past }, { data: res }] = await Promise.all([
        supabase.from('partidos')
          .select('id, fecha, hora_inicio, tipo, estado, sets, jugadores_confirmados, canchas(nombre, clubes(nombre))')
          .in('id', ids).gte('fecha', hoy).order('fecha', { ascending: true }),
        supabase.from('partidos')
          .select('id, fecha, hora_inicio, tipo, estado, sets, jugadores_confirmados, canchas(nombre, clubes(nombre))')
          .in('id', ids).lt('fecha', hoy).order('fecha', { ascending: false }).limit(10),
        supabase.from('resultados_partidos')
          .select('partido_id, resultado, sets').eq('jugador_id', user.id),
      ])

      // Jugadores por partido
      const { data: todosJugadores } = await supabase
        .from('partido_jugadores')
        .select('partido_id, profiles(nombre)')
        .in('partido_id', ids)

      const mapaJugadores = new Map<string, string[]>()
      for (const j of (todosJugadores ?? [])) {
        const arr = mapaJugadores.get(j.partido_id) ?? []
        arr.push((j.profiles as any)?.nombre ?? '')
        mapaJugadores.set(j.partido_id, arr)
      }

      const mapaRes = new Map<string, Resultado>()
      for (const r of (res ?? [])) mapaRes.set(r.partido_id, r)

      setProximos(prox ?? [])
      setPasados(past ?? [])
      setResultados(mapaRes)
      setJugadoresPorPartido(mapaJugadores)
      setLoading(false)
    }
    load()
  }, [router])

  function formatFecha(fecha: string) {
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function necesitaResultado(p: Partido): boolean {
    return !p.sets && p.jugadores_confirmados === 4
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando partidos...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mis partidos</h1>

        {/* Próximos */}
        {proximos.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-gray-700 mb-4">Próximos</h2>
            <div className="flex flex-col gap-4 mb-8">
              {proximos.map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-gray-900 capitalize">{formatFecha(p.fecha)}</p>
                      <p className="text-green-600 font-semibold mt-1">{p.hora_inicio.slice(0, 5)}</p>
                      <p className="text-gray-500 text-sm mt-1">🎾 {p.canchas?.nombre} · {p.canchas?.clubes?.nombre}</p>
                      <div className="flex gap-1 mt-2">
                        {(jugadoresPorPartido.get(p.id) ?? []).map((n, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs ${i <= p.jugadores_confirmados ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-300'}`}>
                          {i <= p.jugadores_confirmados ? '✓' : i}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pasados */}
        <h2 className="text-lg font-bold text-gray-700 mb-4">Historial</h2>
        {pasados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400">No tenés partidos jugados todavía</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pasados.map(p => {
              const res = resultados.get(p.id)
              const esvictoria = res?.resultado === 'victoria'
              const jugadores = jugadoresPorPartido.get(p.id) ?? []

              return (
                <div key={p.id} className={`bg-white rounded-2xl border p-5 ${res ? (esvictoria ? 'border-green-200' : 'border-red-200') : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{formatFecha(p.fecha)} · {p.hora_inicio.slice(0, 5)}</p>
                        {res && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${esvictoria ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {esvictoria ? '🏆 Victoria' : '😤 Derrota'}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm">🎾 {p.canchas?.nombre} · {p.canchas?.clubes?.nombre}</p>
                      {res?.sets && (
                        <p className="text-gray-700 font-semibold text-sm mt-1">📊 {res.sets}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {jugadores.map((n, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>
                    {necesitaResultado(p) && (
                      <a
                        href={`/partidos/${p.id}/resultado`}
                        className="ml-4 bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-green-700 transition-colors whitespace-nowrap"
                      >
                        Ingresar resultado
                      </a>
                    )}
                    {p.estado === 'cancelado' && (
                      <span className="ml-4 text-xs bg-gray-100 text-gray-400 font-semibold px-3 py-2 rounded-xl">Cancelado</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
