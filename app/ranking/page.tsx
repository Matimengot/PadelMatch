'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Jugador {
  id: string
  nombre: string
  nivel: number
  partidos_jugados: number
}

function fiabilidad(partidos: number): number {
  return Math.min(100, partidos * 10)
}

function medallaColor(pos: number): string {
  if (pos === 1) return 'bg-yellow-400 text-yellow-900'
  if (pos === 2) return 'bg-gray-300 text-gray-700'
  if (pos === 3) return 'bg-amber-600 text-white'
  return 'bg-gray-100 text-gray-500'
}

export default function RankingPage() {
  const router = useRouter()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, nivel, partidos_jugados')
        .order('nivel', { ascending: false })
        .limit(50)

      setJugadores(data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const miPosicion = jugadores.findIndex(j => j.id === userId) + 1

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando ranking...</p>
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

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Ranking</h1>
          <p className="text-gray-400 mt-1">Los mejores jugadores de PadelMatch</p>
        </div>

        {/* Top 3 podio */}
        {jugadores.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[jugadores[1], jugadores[0], jugadores[2]].map((j, idx) => {
              const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3
              const esYo = j.id === userId
              return (
                <div key={j.id} className={`bg-white rounded-2xl shadow-sm p-4 text-center flex flex-col items-center gap-2 ${idx === 1 ? 'ring-2 ring-yellow-400' : ''} ${esYo ? 'ring-2 ring-green-400' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${medallaColor(pos)}`}>
                    {pos}
                  </div>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${esYo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {j.nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 truncate max-w-[80px]">{j.nombre?.split(' ')[0]}</p>
                    <p className="text-xl font-black text-green-600 leading-tight">{j.nivel?.toFixed(1)}</p>
                    <p className="text-xs text-gray-400">{j.partidos_jugados} partidos</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Mi posición banner si estoy fuera del top 3 */}
        {miPosicion > 3 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-600 font-medium">Tu posición</p>
              <p className="text-green-800 font-bold">#{miPosicion} en el ranking</p>
            </div>
            <div className="text-2xl font-black text-green-600">
              {jugadores[miPosicion - 1]?.nivel?.toFixed(1)}
            </div>
          </div>
        )}

        {/* Lista completa */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {jugadores.map((j, idx) => {
            const pos = idx + 1
            const esYo = j.id === userId
            const fiab = fiabilidad(j.partidos_jugados)
            return (
              <div
                key={j.id}
                className={`flex items-center gap-4 px-5 py-4 border-b border-gray-50 last:border-0 ${esYo ? 'bg-green-50' : ''}`}
              >
                {/* Posición */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${pos <= 3 ? medallaColor(pos) : 'text-gray-400'}`}>
                  {pos <= 3 ? pos : <span className="text-xs font-semibold text-gray-400">#{pos}</span>}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${esYo ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  {j.nombre?.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm truncate ${esYo ? 'text-green-800' : 'text-gray-900'}`}>{j.nombre}</p>
                    {esYo && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Vos</span>}
                  </div>
                  <p className="text-xs text-gray-400">{j.partidos_jugados} partidos · {fiab}% fiabilidad</p>
                </div>

                {/* Nivel */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-black text-green-600">{j.nivel?.toFixed(1)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
