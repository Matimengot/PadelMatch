'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Jugador {
  jugador_id: string
  profiles: { nombre: string; nivel: number }
}

interface Partido {
  id: string
  fecha: string
  hora_inicio: string
  nivel_min: number
  nivel_max: number
  tipo: string
  genero: string
  jugadores_confirmados: number
  estado: string
  creador_id: string
  canchas: { nombre: string; clubes: { nombre: string } }
  profiles: { nombre: string; nivel: number }
  partido_jugadores: Jugador[]
}

function horasHastaPartido(fecha: string, hora: string): number {
  const inicio = new Date(`${fecha}T${hora}`)
  return (inicio.getTime() - Date.now()) / 36e5
}

function formatFecha(fecha: string, hora: string) {
  const d = new Date(fecha + 'T00:00:00')
  const dia = d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} | ${hora.slice(0, 5)}`
}

function SlotJugador({ jugador, vacio, onClick }: {
  jugador?: { nombre: string; nivel: number }
  vacio?: boolean
  onClick?: (e?: React.MouseEvent) => void
}) {
  if (vacio) {
    return (
      <button onClick={onClick} className="flex flex-col items-center gap-1 group">
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl group-hover:border-green-400 group-hover:text-green-400 transition-colors">
          +
        </div>
        <span className="text-xs text-gray-400">Libre</span>
        <span className="text-xs text-gray-300">—</span>
      </button>
    )
  }

  const inicial = jugador?.nombre?.charAt(0).toUpperCase() ?? '?'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
        {inicial}
      </div>
      <span className="text-xs font-medium text-gray-700 max-w-[56px] truncate text-center">{jugador?.nombre?.split(' ')[0]}</span>
      <span className="text-xs font-bold text-green-600">{jugador?.nivel?.toFixed(1)}</span>
    </div>
  )
}

type FiltroTipo = 'todos' | 'amistoso' | 'competitivo'

export default function PartidosPage() {
  const router = useRouter()
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [misPartidos, setMisPartidos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [miNivel, setMiNivel] = useState<number | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroMiNivel, setFiltroMiNivel] = useState(false)

  function irADetalle(partidoId: string) {
    router.push(`/partidos/${partidoId}`)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      await supabase.rpc('cancelar_partidos_incompletos')

      const hoy = new Date().toISOString().split('T')[0]
      const [{ data }, { data: misP }, { data: prof }] = await Promise.all([
        supabase
          .from('partidos')
          .select(`
            id, fecha, hora_inicio, nivel_min, nivel_max, tipo, genero, jugadores_confirmados, estado, creador_id,
            canchas(nombre, clubes(nombre)),
            profiles!partidos_creador_id_fkey(nombre, nivel),
            partido_jugadores(jugador_id, profiles!partido_jugadores_jugador_id_fkey(nombre, nivel))
          `)
          .gte('fecha', hoy)
          .eq('estado', 'activo')
          .lt('jugadores_confirmados', 4)
          .order('fecha', { ascending: true }),
        supabase.from('partido_jugadores').select('partido_id').eq('jugador_id', user.id),
        supabase.from('profiles').select('nivel').eq('id', user.id).single(),
      ])

      setMisPartidos(new Set((misP ?? []).map(p => p.partido_id)))
      setPartidos(data ?? [])
      if (prof) setMiNivel(prof.nivel)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleCancelar(partido: Partido) {
    const horas = horasHastaPartido(partido.fecha, partido.hora_inicio)
    if (partido.jugadores_confirmados >= 4 && horas < 24) {
      alert('No podés cancelar un partido lleno con menos de 24 horas de anticipación.')
      return
    }
    if (!confirm('¿Seguro que querés cancelarte de este partido?')) return
    setCancelando(partido.id)
    await supabase.from('partido_jugadores').delete().eq('partido_id', partido.id).eq('jugador_id', userId!)
    const nuevosJugadores = partido.jugadores_confirmados - 1
    if (nuevosJugadores === 0) {
      await supabase.from('partidos').update({ estado: 'cancelado' }).eq('id', partido.id)
      setPartidos(prev => prev.filter(p => p.id !== partido.id))
    } else {
      await supabase.from('partidos').update({ jugadores_confirmados: nuevosJugadores }).eq('id', partido.id)
      setPartidos(prev => prev.map(p =>
        p.id === partido.id ? { ...p, jugadores_confirmados: nuevosJugadores } : p
      ))
    }
    setMisPartidos(prev => { const s = new Set(prev); s.delete(partido.id); return s })
    setCancelando(null)
  }

  const partidosFiltrados = partidos
    .filter(p => filtroTipo === 'todos' || p.tipo === filtroTipo)
    .filter(p => !filtroMiNivel || !miNivel || (p.nivel_min <= miNivel && p.nivel_max >= miNivel))

  const GENERO_LABEL: Record<string, string> = {
    todos: '👥 Todos',
    mujeres: '♀ Solo mujeres',
    mixto: '⚡ Mixto',
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
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Canchas</a>
          <a href="/partidos" className="text-green-600 font-semibold">Partidos</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partidos abiertos</h1>
            <p className="text-gray-400 mt-1">Unite a un partido o creá el tuyo</p>
          </div>
          <a href="/partidos/nuevo" className="bg-green-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-700 transition-colors">
            + Crear
          </a>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['todos', 'amistoso', 'competitivo'] as FiltroTipo[]).map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                filtroTipo === tipo
                  ? tipo === 'competitivo'
                    ? 'bg-orange-500 text-white border-orange-500'
                    : tipo === 'amistoso'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tipo === 'todos' ? 'Todos' : tipo === 'amistoso' ? '🤝 Amistoso' : '⚡ Competitivo'}
            </button>
          ))}
          {miNivel && (
            <button
              onClick={() => setFiltroMiNivel(prev => !prev)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                filtroMiNivel
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              Mi nivel ({miNivel?.toFixed(1)})
            </button>
          )}
        </div>

        {partidosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">🎾</p>
            <p className="text-gray-500 text-lg">
              {partidos.length === 0 ? 'No hay partidos abiertos por ahora' : 'Ningún partido coincide con los filtros'}
            </p>
            {partidos.length === 0 && (
              <a href="/partidos/nuevo" className="mt-4 inline-block text-green-600 font-semibold hover:underline">
                Creá el primero
              </a>
            )}
            {partidos.length > 0 && (
              <button onClick={() => { setFiltroTipo('todos'); setFiltroMiNivel(false) }} className="mt-4 inline-block text-green-600 font-semibold hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {partidosFiltrados.map(partido => {
              const yaUnido = misPartidos.has(partido.id)
              const horas = horasHastaPartido(partido.fecha, partido.hora_inicio)
              const puedeCancel = yaUnido && !(partido.jugadores_confirmados >= 4 && horas < 24)
              const jugadores = partido.partido_jugadores ?? []

              return (
                <div
                  key={partido.id}
                  onClick={() => irADetalle(partido.id)}
                  className={`bg-white rounded-2xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow ${yaUnido ? 'border-green-200' : 'border-gray-100'}`}
                >
                  {/* Fecha y tipo */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="font-bold text-gray-900 text-lg capitalize">
                        {formatFecha(partido.fecha, partido.hora_inicio)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          partido.tipo === 'competitivo' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {partido.tipo === 'competitivo' ? '⚡ Competitivo' : '🤝 Amistoso'}
                        </span>
                        <span className="text-xs text-gray-400">Nivel {partido.nivel_min} — {partido.nivel_max}</span>
                        {partido.genero && partido.genero !== 'todos' && (
                          <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2.5 py-0.5 rounded-full">
                            {GENERO_LABEL[partido.genero] ?? partido.genero}
                          </span>
                        )}
                        {yaUnido && <span className="text-xs bg-green-600 text-white font-semibold px-2 py-0.5 rounded-full">Inscripto</span>}
                      </div>
                    </div>
                  </div>

                  {/* Slots jugadores */}
                  {(() => {
                    const slots = [
                      ...jugadores.slice(0, 4).map((j, i) => <SlotJugador key={i} jugador={j.profiles} />),
                      ...Array.from({ length: Math.max(0, 4 - jugadores.length) }).map((_, i) => (
                        <SlotJugador
                          key={`libre-${i}`}
                          vacio
                          onClick={!yaUnido ? (e?: React.MouseEvent) => { e?.stopPropagation(); irADetalle(partido.id) } : undefined}
                        />
                      ))
                    ].slice(0, 4)

                    return (
                      <div className="flex items-center justify-around mb-6">
                        {slots[0]}
                        {slots[1]}
                        <div className="flex flex-col items-center gap-1 px-2">
                          <div className="h-10 w-px bg-gray-200" />
                          <span className="text-xs text-gray-300 font-medium">VS</span>
                          <div className="h-10 w-px bg-gray-200" />
                        </div>
                        {slots[2]}
                        {slots[3]}
                      </div>
                    )
                  })()}

                  {/* Club + botón */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{partido.canchas?.clubes?.nombre}</p>
                      <p className="text-xs text-gray-400">{partido.canchas?.nombre} · 90 min</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-green-600 font-bold">$475 <span className="text-gray-400 font-normal text-xs">/ jugador</span></p>
                        <p className="text-xs text-gray-400">$1.900 cancha</p>
                      </div>
                      {yaUnido ? (
                        <button
                          onClick={e => { e.stopPropagation(); handleCancelar(partido) }}
                          disabled={cancelando === partido.id || !puedeCancel}
                          className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
                            puedeCancel
                              ? 'border border-red-200 text-red-500 hover:bg-red-50'
                              : 'border border-gray-100 text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          {cancelando === partido.id ? 'Cancelando...' : 'Cancelarme'}
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); irADetalle(partido.id) }}
                          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-green-700 transition-colors"
                        >
                          Ver partido
                        </button>
                      )}
                    </div>
                  </div>

                  {horas <= 4 && horas > 0 && partido.jugadores_confirmados < 4 && (
                    <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-xs text-orange-600 font-medium">
                      ⚠️ Si no se completan 4 jugadores en {Math.floor(horas)}h {Math.round((horas % 1) * 60)}min, el partido se cancela
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
