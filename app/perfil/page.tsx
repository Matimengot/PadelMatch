'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  nombre: string
  nivel: number
  partidos_jugados: number
}

interface Resultado {
  id: string
  resultado: string
  nivel_anterior: number
  nivel_nuevo: number
  created_at: string
}

interface Amigo {
  amigo_id: string
  profiles: { nombre: string; nivel: number }
}

function fiabilidad(partidos: number): number {
  return Math.min(100, partidos * 10)
}

function fiabilidadLabel(pct: number): { label: string; color: string; bg: string } {
  if (pct >= 80) return { label: 'ALTA', color: 'text-green-700', bg: 'bg-green-100' }
  if (pct >= 40) return { label: 'MEDIA', color: 'text-orange-700', bg: 'bg-orange-100' }
  return { label: 'BAJA', color: 'text-red-700', bg: 'bg-red-100' }
}

function NivelChart({ resultados }: { resultados: Resultado[] }) {
  if (resultados.length < 2) return null
  const valores = resultados.map(r => r.nivel_nuevo)
  const min = Math.min(...valores) - 0.3
  const max = Math.max(...valores) + 0.3
  const rango = max - min
  const W = 300, H = 80, pad = 16
  const puntos = valores.map((v, i) => ({
    x: pad + (i / (valores.length - 1)) * (W - pad * 2),
    y: H - pad - ((v - min) / rango) * (H - pad * 2),
    v
  }))
  const path = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const area = `${path} L ${puntos[puntos.length - 1].x} ${H} L ${puntos[0].x} ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#grad)" />
      <path d={path} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#16a34a" strokeWidth="2" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill="#6b7280">{p.v.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [amigos, setAmigos] = useState<Amigo[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const [{ data: prof }, { data: res }, { data: amg }] = await Promise.all([
        supabase.from('profiles').select('id, nombre, nivel, partidos_jugados').eq('id', user.id).single(),
        supabase.from('resultados_partidos').select('id, resultado, nivel_anterior, nivel_nuevo, created_at').eq('jugador_id', user.id).order('created_at', { ascending: true }).limit(10),
        supabase.from('amigos').select('amigo_id, profiles(nombre, nivel)').eq('jugador_id', user.id),
      ])
      setProfile(prof)
      setResultados(res ?? [])
      setAmigos(amg ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  useEffect(() => {
    if (busqueda.length < 2) { setResultadosBusqueda([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, nombre, nivel').ilike('nombre', `%${busqueda}%`).neq('id', userId ?? '').limit(5)
      setResultadosBusqueda(data ?? [])
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda, userId])

  async function handleAgregarAmigo(amigo: Profile) {
    if (!userId) return
    await supabase.from('amigos').insert({ jugador_id: userId, amigo_id: amigo.id })
    setAmigos(prev => [...prev, { amigo_id: amigo.id, profiles: { nombre: amigo.nombre, nivel: amigo.nivel } }])
    setBusqueda('')
    setResultadosBusqueda([])
  }

  async function handleEliminarAmigo(amigoId: string) {
    if (!userId) return
    await supabase.from('amigos').delete().eq('jugador_id', userId).eq('amigo_id', amigoId)
    setAmigos(prev => prev.filter(a => a.amigo_id !== amigoId))
  }

  const victorias = resultados.filter(r => r.resultado === 'victoria').length
  const derrotas = resultados.filter(r => r.resultado === 'derrota').length
  const fiab = fiabilidad(profile?.partidos_jugados ?? resultados.length)
  const fiabInfo = fiabilidadLabel(fiab)
  const winRate = resultados.length > 0 ? Math.round((victorias / resultados.length) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Canchas</a>
          <a href="/partidos" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Partidos</a>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">

        {/* Banner perfil */}
        <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-2xl p-6 text-white shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-2 border-white/30">
              {profile?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile?.nombre}</h1>
              <p className="text-green-200 text-sm mt-0.5">{profile?.partidos_jugados ?? 0} partidos jugados</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-green-200 font-medium mb-1 uppercase tracking-wider">Nivel</p>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex flex-col items-center justify-center border border-white/30 gap-0.5">
                <span className="text-3xl font-black leading-none">{profile?.nivel?.toFixed(1)}</span>
                <span className="text-xs text-green-200">/ 7.0</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{victorias}</p>
              <p className="text-xs text-green-200 mt-0.5">Victorias</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{derrotas}</p>
              <p className="text-xs text-green-200 mt-0.5">Derrotas</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-xs text-green-200 mt-0.5">Win rate</p>
            </div>
          </div>
        </div>

        {/* Fiabilidad */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Fiabilidad del nivel</h2>
              <p className="text-xs text-gray-400 mt-0.5">Basado en partidos competitivos jugados</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${fiabInfo.bg} ${fiabInfo.color}`}>
                {fiabInfo.label}
              </span>
              <span className="text-2xl font-bold text-green-600">{fiab}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full transition-all duration-700" style={{ width: `${fiab}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {fiab < 100
              ? `Jugá ${Math.ceil((100 - fiab) / 10)} partidos competitivos más para alcanzar el 100%`
              : 'Tu nivel es altamente confiable'}
          </p>
        </div>

        {/* Evolución */}
        {resultados.length >= 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Evolución de nivel</h2>
            <NivelChart resultados={resultados} />
          </div>
        )}

        {/* Últimos resultados */}
        {resultados.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Últimos partidos</h2>
            <div className="flex flex-col gap-2">
              {[...resultados].reverse().map(r => {
                const diff = r.nivel_nuevo - r.nivel_anterior
                const esvictoria = r.resultado === 'victoria'
                return (
                  <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${esvictoria ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {esvictoria ? 'V' : 'D'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{esvictoria ? 'Victoria' : 'Derrota'}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(r.created_at).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-400">{r.nivel_anterior.toFixed(1)} → {r.nivel_nuevo.toFixed(1)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Amigos */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">Amigos ({amigos.length})</h2>
          <div className="relative mb-4">
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscá un jugador por nombre..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            {resultadosBusqueda.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                {resultadosBusqueda.map(j => (
                  <button
                    key={j.id}
                    onClick={() => handleAgregarAmigo(j)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                        {j.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{j.nombre}</span>
                    </div>
                    <span className="text-xs text-gray-400">Nivel {j.nivel?.toFixed(1)} · + Agregar</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {amigos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Todavía no tenés amigos en PadelMatch</p>
          ) : (
            <div className="flex flex-col gap-1">
              {amigos.map(a => (
                <div key={a.amigo_id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">
                      {a.profiles?.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{a.profiles?.nombre}</p>
                      <p className="text-xs text-gray-400">Nivel {a.profiles?.nivel?.toFixed(1)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleEliminarAmigo(a.amigo_id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                    Eliminar
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
