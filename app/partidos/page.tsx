'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Partido {
  id: string
  fecha: string
  hora_inicio: string
  nivel_min: number
  nivel_max: number
  tipo: string
  jugadores_confirmados: number
  estado: string
  creador_id: string
  canchas: { nombre: string; clubes: { nombre: string } }
  profiles: { nombre: string }
}

function horasHastaPartido(fecha: string, hora: string): number {
  const inicio = new Date(`${fecha}T${hora}`)
  return (inicio.getTime() - Date.now()) / 36e5
}

export default function PartidosPage() {
  const router = useRouter()
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [misPartidos, setMisPartidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [uniendose, setUniendose] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Correr cancelación automática de partidos incompletos
      await supabase.rpc('cancelar_partidos_incompletos')

      const hoy = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('partidos')
        .select('id, fecha, hora_inicio, nivel_min, nivel_max, tipo, jugadores_confirmados, estado, creador_id, canchas(nombre, clubes(nombre)), profiles(nombre)')
        .gte('fecha', hoy)
        .eq('estado', 'activo')
        .lt('jugadores_confirmados', 4)
        .order('fecha', { ascending: true })

      // Mis partidos (para mostrar botón cancelar)
      const { data: misP } = await supabase
        .from('partido_jugadores')
        .select('partido_id')
        .eq('jugador_id', user.id)

      setMisPartidos(new Set((misP ?? []).map(p => p.partido_id)))
      setPartidos(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleUnirse(partido: Partido) {
    if (!userId) return
    setUniendose(partido.id)
    await supabase.from('partido_jugadores').insert({ partido_id: partido.id, jugador_id: userId })
    await supabase.from('partidos').update({ jugadores_confirmados: partido.jugadores_confirmados + 1 }).eq('id', partido.id)
    setPartidos(prev => prev.map(p =>
      p.id === partido.id ? { ...p, jugadores_confirmados: p.jugadores_confirmados + 1 } : p
    ).filter(p => p.jugadores_confirmados < 4))
    setMisPartidos(prev => new Set([...prev, partido.id]))
    setUniendose(null)
  }

  async function handleCancelar(partido: Partido) {
    const horas = horasHastaPartido(partido.fecha, partido.hora_inicio)

    if (partido.jugadores_confirmados >= 4 && horas < 24) {
      alert('No podés cancelar un partido lleno con menos de 24 horas de anticipación.')
      return
    }

    if (!confirm('¿Seguro que querés cancelarte de este partido?')) return
    setCancelando(partido.id)

    await supabase.from('partido_jugadores').delete()
      .eq('partido_id', partido.id).eq('jugador_id', userId!)

    const nuevosJugadores = partido.jugadores_confirmados - 1
    if (nuevosJugadores === 0) {
      await supabase.from('partidos').update({ estado: 'cancelado' }).eq('id', partido.id)
    } else {
      await supabase.from('partidos').update({ jugadores_confirmados: nuevosJugadores }).eq('id', partido.id)
    }

    setPartidos(prev => prev.filter(p => p.id !== partido.id))
    setMisPartidos(prev => { const s = new Set(prev); s.delete(partido.id); return s })
    setCancelando(null)
  }

  function formatFecha(fecha: string) {
    const d = new Date(fecha + 'T00:00:00')
    return d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
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
          <a href="/partidos" className="text-green-600 font-semibold">Partidos</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partidos abiertos</h1>
            <p className="text-gray-500 mt-1">Unite a un partido o creá el tuyo</p>
          </div>
          <a href="/partidos/nuevo" className="bg-green-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-700 transition-colors">
            + Crear partido
          </a>
        </div>

        {partidos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">🎾</p>
            <p className="text-gray-500 text-lg">No hay partidos abiertos por ahora</p>
            <a href="/partidos/nuevo" className="mt-4 inline-block text-green-600 font-semibold hover:underline">
              Creá el primero
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {partidos.map(partido => {
              const yaUnido = misPartidos.has(partido.id)
              const horas = horasHastaPartido(partido.fecha, partido.hora_inicio)
              const puedeCancel = yaUnido && !(partido.jugadores_confirmados >= 4 && horas < 24)

              return (
                <div key={partido.id} className={`bg-white rounded-2xl border p-6 ${yaUnido ? 'border-green-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          partido.tipo === 'competitivo' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {partido.tipo === 'competitivo' ? '⚡ Competitivo' : '🤝 Amistoso'}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">Nivel {partido.nivel_min} — {partido.nivel_max}</span>
                        {yaUnido && <span className="text-xs bg-green-600 text-white font-semibold px-2 py-0.5 rounded-full">Inscripto</span>}
                      </div>
                      <p className="font-bold text-gray-900 text-lg capitalize">{formatFecha(partido.fecha)}</p>
                      <p className="text-gray-500 text-sm mt-1">
                        🕐 {partido.hora_inicio.slice(0, 5)} · 🎾 {partido.canchas?.nombre} · {partido.canchas?.clubes?.nombre}
                      </p>
                      <p className="text-gray-400 text-xs mt-2">Creado por {partido.profiles?.nombre}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3 ml-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${
                            i <= partido.jugadores_confirmados ? 'bg-green-600 border-green-600 text-white' : 'border-gray-200 text-gray-300'
                          }`}>
                            {i <= partido.jugadores_confirmados ? '✓' : i}
                          </div>
                        ))}
                      </div>
                      {yaUnido ? (
                        <button
                          onClick={() => handleCancelar(partido)}
                          disabled={cancelando === partido.id || !puedeCancel}
                          className={`text-sm font-semibold px-5 py-2 rounded-full transition-colors ${
                            puedeCancel
                              ? 'border border-red-200 text-red-500 hover:bg-red-50'
                              : 'border border-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                          title={!puedeCancel ? 'No podés cancelar con menos de 24hs si el partido está lleno' : ''}
                        >
                          {cancelando === partido.id ? 'Cancelando...' : 'Cancelarme'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnirse(partido)}
                          disabled={uniendose === partido.id}
                          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {uniendose === partido.id ? 'Uniéndose...' : 'Unirse'}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Aviso cancelación automática */}
                  {horas <= 4 && horas > 0 && partido.jugadores_confirmados < 4 && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-xs text-orange-600 font-medium">
                      ⚠️ Si no se completan 4 jugadores en {Math.floor(horas)}h {Math.round((horas % 1) * 60)}min, el partido se cancela y se devuelve el pago
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
