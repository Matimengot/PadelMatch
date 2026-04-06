'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Cancha {
  id: string
  nombre: string
  clubes: { nombre: string; lat: number; lng: number }
}

interface Jugador {
  id: string
  nombre: string
  nivel: number
}

const HORARIOS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30']
const NIVELES = ['1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0','5.5','6.0','6.5','7.0']
const DELTA = 0.6

function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function NuevoPartidoPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [todasCanchas, setTodasCanchas] = useState<Cancha[]>([])
  const [canchasDisponibles, setCanchasDisponibles] = useState<Cancha[]>([])
  const [canchaId, setCanchaId] = useState('')
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [nivelMin, setNivelMin] = useState('1.0')
  const [nivelMax, setNivelMax] = useState('7.0')
  const [miNivel, setMiNivel] = useState(3.0)
  const [tipo, setTipo] = useState('amistoso')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Jugador[]>([])
  const [companero, setCompanero] = useState<Jugador | null>(null)
  const [loading, setLoading] = useState(false)
  const [cargandoCanchas, setCargandoCanchas] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('nivel')
        .eq('id', user.id)
        .single()
      if (profile) setMiNivel(profile.nivel)

      const { data: canchas } = await supabase
        .from('canchas')
        .select('id, nombre, clubes(nombre, lat, lng)')

      if (!canchas) return

      try {
        const res = await fetch('https://ip-api.com/json/?fields=lat,lon')
        const geo = await res.json()
        if (geo.lat && geo.lon) {
          const ordenadas = [...canchas].sort((a, b) => {
            const dA = distanciaKm(geo.lat, geo.lon, a.clubes?.lat ?? 0, a.clubes?.lng ?? 0)
            const dB = distanciaKm(geo.lat, geo.lon, b.clubes?.lat ?? 0, b.clubes?.lng ?? 0)
            return dA - dB
          })
          setTodasCanchas(ordenadas)
          setCanchasDisponibles(ordenadas)
          return
        }
      } catch (_) {}

      setTodasCanchas(canchas)
      setCanchasDisponibles(canchas)
    }
    load()
  }, [router])

  useEffect(() => {
    if (!fecha || !hora) {
      setCanchasDisponibles(todasCanchas)
      setCanchaId('')
      return
    }
    async function filtrarDisponibles() {
      setCargandoCanchas(true)
      const { data: reservas } = await supabase
        .from('reservas')
        .select('cancha_id')
        .eq('fecha', fecha)
        .eq('hora_inicio', hora + ':00')
      const ocupadas = new Set((reservas ?? []).map(r => r.cancha_id))
      setCanchasDisponibles(todasCanchas.filter(c => !ocupadas.has(c.id)))
      setCanchaId('')
      setCargandoCanchas(false)
    }
    filtrarDisponibles()
  }, [fecha, hora, todasCanchas])

  useEffect(() => {
    if (tipo === 'competitivo') {
      const min = Math.max(1.0, parseFloat((miNivel - DELTA).toFixed(1)))
      const max = Math.min(7.0, parseFloat((miNivel + DELTA).toFixed(1)))
      setNivelMin(min.toFixed(1))
      setNivelMax(max.toFixed(1))
    } else {
      setNivelMin('1.0')
      setNivelMax('7.0')
    }
  }, [tipo, miNivel])

  // Buscar compañero por nombre
  useEffect(() => {
    if (busqueda.length < 2) { setResultados([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, nivel')
        .ilike('nombre', `%${busqueda}%`)
        .neq('id', userId ?? '')
        .limit(5)
      setResultados(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda, userId])

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const jugadoresIniciales = companero ? 2 : 1

    const { data: partido, error: errPartido } = await supabase
      .from('partidos')
      .insert({
        creador_id: user.id,
        cancha_id: canchaId,
        fecha,
        hora_inicio: hora,
        nivel_min: parseFloat(nivelMin),
        nivel_max: parseFloat(nivelMax),
        tipo,
        jugadores_confirmados: jugadoresIniciales,
      })
      .select('id')
      .single()

    if (errPartido || !partido) {
      setError('Error al crear el partido. Intentá de nuevo.')
      setLoading(false)
      return
    }

    const inserts = [{ partido_id: partido.id, jugador_id: user.id }]
    if (companero) inserts.push({ partido_id: partido.id, jugador_id: companero.id })
    await supabase.from('partido_jugadores').insert(inserts)

    router.push('/partidos')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <a href="/partidos" className="text-gray-500 hover:text-gray-900 text-sm">← Volver</a>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear partido</h1>
        <p className="text-gray-500 mb-8">Completá los datos y otros jugadores podrán unirse</p>

        <form onSubmit={handleCrear} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de partido</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTipo('amistoso')}
                className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${tipo === 'amistoso' ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                🤝 Amistoso
              </button>
              <button type="button" onClick={() => setTipo('competitivo')}
                className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${tipo === 'competitivo' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}>
                ⚡ Competitivo
              </button>
            </div>
          </div>

          {/* Rango de nivel */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Rango de nivel</label>
              {tipo === 'competitivo' && (
                <span className="text-xs text-orange-500 font-medium">Auto según tu nivel ({miNivel.toFixed(1)})</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Mínimo</p>
                <select value={nivelMin} onChange={e => setNivelMin(e.target.value)} disabled={tipo === 'competitivo'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400">
                  {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Máximo</p>
                <select value={nivelMax} onChange={e => setNivelMax(e.target.value)} disabled={tipo === 'competitivo'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400">
                  {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* Preview del rango para competitivo */}
            {tipo === 'competitivo' && (
              <div className="mt-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-orange-700">
                Este partido será visible para jugadores de nivel <strong>{nivelMin}</strong> a <strong>{nivelMax}</strong>
              </div>
            )}
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={fecha} min={new Date().toISOString().split('T')[0]}
                onChange={e => setFecha(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
              <select value={hora} onChange={e => setHora(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Elegí</option>
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          {/* Cancha */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Cancha</label>
              {fecha && hora && (
                <span className="text-xs text-gray-400">
                  {cargandoCanchas ? 'Verificando...' : `${canchasDisponibles.length} disponibles`}
                </span>
              )}
            </div>
            <select value={canchaId} onChange={e => setCanchaId(e.target.value)} required disabled={cargandoCanchas}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
              <option value="">{!fecha || !hora ? 'Primero elegí fecha y horario' : 'Elegí una cancha'}</option>
              {canchasDisponibles.map(c => (
                <option key={c.id} value={c.id}>{c.clubes?.nombre} — {c.nombre}</option>
              ))}
            </select>
            {fecha && hora && canchasDisponibles.length === 0 && !cargandoCanchas && (
              <p className="text-sm text-red-500 mt-2">No hay canchas disponibles en ese horario. Probá otro.</p>
            )}
          </div>

          {/* Compañero */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compañero <span className="text-gray-400 font-normal">(opcional)</span></label>
            {companero ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <div>
                  <p className="font-semibold text-green-800">{companero.nombre}</p>
                  <p className="text-xs text-green-600">Nivel {companero.nivel.toFixed(1)}</p>
                </div>
                <button type="button" onClick={() => { setCompanero(null); setBusqueda('') }}
                  className="text-green-400 hover:text-red-500 transition-colors text-sm font-medium">
                  Quitar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscá por nombre..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {resultados.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                    {resultados.map(j => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => { setCompanero(j); setBusqueda(''); setResultados([]) }}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 transition-colors text-left"
                      >
                        <span className="font-medium text-gray-900">{j.nombre}</span>
                        <span className="text-xs text-gray-400">Nivel {j.nivel.toFixed(1)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">Si agregás compañero, el partido arranca con 2/4 jugadores</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading || canchasDisponibles.length === 0}
            className="bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-lg mt-2">
            {loading ? 'Creando...' : 'Crear partido'}
          </button>
        </form>
      </main>
    </div>
  )
}
