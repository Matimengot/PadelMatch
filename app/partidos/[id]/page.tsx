'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Jugador {
  jugador_id: string
  equipo: number | null
  profiles: { nombre: string; nivel: number }
}

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
  sets: string | null
  canchas: { nombre: string; clubes: { nombre: string } }
}

function formatFecha(fecha: string, hora: string) {
  const d = new Date(fecha + 'T00:00:00')
  const dia = d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · ${hora.slice(0, 5)}`
}

function SlotJugador({ jugador, esYo }: {
  jugador: { nombre: string; nivel: number }
  esYo?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ${
        esYo ? 'bg-green-600 text-white ring-2 ring-green-400 ring-offset-2' : 'bg-gray-100 text-gray-700'
      }`}>
        {jugador.nombre?.charAt(0).toUpperCase()}
      </div>
      <span className="text-xs font-semibold text-gray-800 truncate max-w-[64px] text-center">
        {jugador.nombre?.split(' ')[0]}
      </span>
      <span className="text-xs font-bold text-green-600">{jugador.nivel?.toFixed(1)}</span>
      {esYo && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Vos</span>}
    </div>
  )
}

function SlotVacio({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-center gap-1.5 w-full group disabled:opacity-40"
    >
      <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl group-hover:border-green-400 group-hover:text-green-400 transition-colors">
        +
      </div>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-xs text-transparent">—</span>
    </button>
  )
}

export default function PartidoDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [partido, setPartido] = useState<Partido | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uniendose, setUniendose] = useState<number | null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function handleCompartir() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'PadelMatch — Unite a este partido', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  async function cargarJugadores(partidoId: string) {
    const { data: j } = await supabase
      .from('partido_jugadores')
      .select('jugador_id, equipo, profiles!partido_jugadores_jugador_id_fkey(nombre, nivel)')
      .eq('partido_id', partidoId)
    const conEquipos = (j ?? []).map((jug, i) => ({
      ...jug,
      equipo: jug.equipo ?? (i < 2 ? 1 : 2),
    }))
    setJugadores(conEquipos)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: p } = await supabase
        .from('partidos')
        .select('id, fecha, hora_inicio, nivel_min, nivel_max, tipo, jugadores_confirmados, estado, creador_id, sets, canchas(nombre, clubes(nombre))')
        .eq('id', id)
        .single()

      if (!p) { router.push('/partidos'); return }
      setPartido(p)
      await cargarJugadores(id as string)
      setLoading(false)
    }
    load()
  }, [id, router])

  const equipo1 = jugadores.filter(j => j.equipo === 1)
  const equipo2 = jugadores.filter(j => j.equipo === 2)
  const miJugador = jugadores.find(j => j.jugador_id === userId)
  const yaUnido = !!miJugador
  const esPasado = partido ? new Date(`${partido.fecha}T${partido.hora_inicio}`) < new Date() : false
  const necesitaResultado = esPasado && yaUnido && !partido?.sets && partido?.jugadores_confirmados === 4
  const horasRestantes = partido
    ? (new Date(`${partido.fecha}T${partido.hora_inicio}`).getTime() - Date.now()) / 36e5
    : 999
  const puedeCancelar = yaUnido && !(partido?.jugadores_confirmados === 4 && horasRestantes < 24)

  async function handleUnirse(equipo: number) {
    if (!userId || !partido) return
    setUniendose(equipo)
    await supabase.from('partido_jugadores').insert({ partido_id: partido.id, jugador_id: userId, equipo })
    const nuevosJugadores = partido.jugadores_confirmados + 1
    await supabase.from('partidos').update({ jugadores_confirmados: nuevosJugadores }).eq('id', partido.id)
    setPartido(prev => prev ? { ...prev, jugadores_confirmados: nuevosJugadores } : prev)
    await cargarJugadores(partido.id)
    setUniendose(null)
  }

  async function handleCancelar() {
    if (!userId || !partido) return
    if (!confirm('¿Seguro que querés cancelarte de este partido?')) return
    setCancelando(true)
    await supabase.from('partido_jugadores').delete().eq('partido_id', partido.id).eq('jugador_id', userId)
    const nuevosJugadores = partido.jugadores_confirmados - 1
    if (nuevosJugadores === 0) {
      await supabase.from('partidos').update({ estado: 'cancelado' }).eq('id', partido.id)
    } else {
      await supabase.from('partidos').update({ jugadores_confirmados: nuevosJugadores }).eq('id', partido.id)
    }
    router.push('/partidos')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  if (!partido) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-light"
          >
            ←
          </button>
          <span className="text-xl font-bold text-green-600">PadelMatch</span>
        </div>
        <button
          onClick={handleCompartir}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-600 transition-colors border border-gray-200 hover:border-green-300 px-4 py-2 rounded-full"
        >
          {copiado ? '✓ Copiado' : '↑ Compartir'}
        </button>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-8 flex flex-col gap-4">

        {/* Info del partido */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-bold text-gray-900 text-lg capitalize">
                {formatFecha(partido.fecha, partido.hora_inicio)}
              </p>
              <p className="text-gray-600 text-sm font-medium mt-1">{partido.canchas?.clubes?.nombre}</p>
              <p className="text-gray-400 text-xs mt-0.5">{partido.canchas?.nombre} · 90 min</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
              partido.tipo === 'competitivo'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {partido.tipo === 'competitivo' ? '⚡ Competitivo' : '🤝 Amistoso'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-3 py-1 rounded-full">
              Nivel {partido.nivel_min} — {partido.nivel_max}
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 font-medium px-3 py-1 rounded-full">
              {partido.jugadores_confirmados}/4 jugadores
            </span>
            {yaUnido && (
              <span className="text-xs bg-green-100 text-green-700 font-semibold px-3 py-1 rounded-full">
                ✓ Inscripto
              </span>
            )}
          </div>
        </div>

        {/* Cancha — equipos */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-[1fr_32px_1fr] gap-3 items-start">

            {/* Pareja A */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-5">Pareja A</p>
              <div className="flex flex-col gap-6">
                {equipo1[0]
                  ? <SlotJugador jugador={equipo1[0].profiles} esYo={equipo1[0].jugador_id === userId} />
                  : <SlotVacio label={!yaUnido ? 'Apuntarme' : 'Libre'} onClick={!yaUnido ? () => handleUnirse(1) : undefined} />
                }
                {equipo1[1]
                  ? <SlotJugador jugador={equipo1[1].profiles} esYo={equipo1[1].jugador_id === userId} />
                  : <SlotVacio label={!yaUnido ? 'Apuntarme' : 'Libre'} onClick={!yaUnido ? () => handleUnirse(1) : undefined} />
                }
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center pt-10 gap-1">
              <div className="h-10 w-px bg-gray-200" />
              <span className="text-xs text-gray-300 font-bold">VS</span>
              <div className="h-10 w-px bg-gray-200" />
            </div>

            {/* Pareja B */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center mb-5">Pareja B</p>
              <div className="flex flex-col gap-6">
                {equipo2[0]
                  ? <SlotJugador jugador={equipo2[0].profiles} esYo={equipo2[0].jugador_id === userId} />
                  : <SlotVacio label={!yaUnido ? 'Apuntarme' : 'Libre'} onClick={!yaUnido ? () => handleUnirse(2) : undefined} />
                }
                {equipo2[1]
                  ? <SlotJugador jugador={equipo2[1].profiles} esYo={equipo2[1].jugador_id === userId} />
                  : <SlotVacio label={!yaUnido ? 'Apuntarme' : 'Libre'} onClick={!yaUnido ? () => handleUnirse(2) : undefined} />
                }
              </div>
            </div>
          </div>
        </div>

        {/* Precio */}
        <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Total cancha</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">$1.900</p>
            <p className="text-xs text-gray-400 mt-0.5">90 min</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Por jugador</p>
            <p className="text-sm font-semibold text-green-600 mt-0.5">$475</p>
          </div>
        </div>

        {/* Alerta tiempo */}
        {!esPasado && !yaUnido && horasRestantes <= 4 && horasRestantes > 0 && partido.jugadores_confirmados < 4 && (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3 text-sm text-orange-600 font-medium">
            ⚠️ Si no se completan 4 jugadores en {Math.floor(horasRestantes)}h {Math.round((horasRestantes % 1) * 60)}min, el partido se cancela automáticamente
          </div>
        )}

        {/* Resultado ya ingresado */}
        {partido.sets && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <p className="text-xs text-green-500 font-medium mb-1">RESULTADO FINAL</p>
            <p className="text-green-800 font-bold text-lg">{partido.sets}</p>
          </div>
        )}

        {/* Uniéndose loading */}
        {uniendose !== null && (
          <div className="w-full bg-green-600 text-white font-semibold py-4 rounded-2xl text-center opacity-60">
            Uniéndose...
          </div>
        )}

        {/* Botón ingresar resultado */}
        {necesitaResultado && (
          <a
            href={`/partidos/${partido.id}/resultado`}
            className="w-full bg-green-600 text-white font-semibold py-4 rounded-2xl hover:bg-green-700 transition-colors text-center block"
          >
            Ingresar resultado
          </a>
        )}

        {/* Botón cancelar */}
        {yaUnido && !esPasado && (
          <button
            onClick={handleCancelar}
            disabled={cancelando || !puedeCancelar}
            className={`w-full font-semibold py-4 rounded-2xl border transition-colors ${
              puedeCancelar
                ? 'border-red-200 text-red-500 hover:bg-red-50'
                : 'border-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {cancelando ? 'Cancelando...' : 'Cancelarme del partido'}
          </button>
        )}

      </main>
    </div>
  )
}
