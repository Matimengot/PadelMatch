'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Club {
  id: string
  nombre: string
  direccion: string
  canchas: Cancha[]
}

interface Cancha {
  id: string
  nombre: string
  precio_hora: number
}

export default function CanchasPage() {
  const [clubes, setClubes] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clubes')
        .select('id, nombre, direccion, canchas(id, nombre, precio_hora)')

      setClubes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando clubes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-green-600 font-semibold">Canchas</a>
          <a href="/partidos" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Partidos</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Reservar cancha</h1>
        <p className="text-gray-400 mb-8">Elegí tu club y horario</p>

        <div className="flex flex-col gap-6">
          {clubes.map(club => (
            <div key={club.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-500 px-6 py-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{club.nombre}</h2>
                    <p className="text-green-200 text-sm mt-1">📍 {club.direccion}</p>
                  </div>
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mt-1">
                    {club.canchas?.length} canchas
                  </span>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                {club.canchas?.map(cancha => (
                  <a
                    key={cancha.id}
                    href={`/canchas/${cancha.id}`}
                    className="flex items-center justify-between border border-gray-100 rounded-xl px-5 py-4 hover:border-green-300 hover:bg-green-50 transition-all group"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-green-700">{cancha.nombre}</p>
                      <p className="text-green-600 font-bold text-sm mt-0.5">${cancha.precio_hora} <span className="text-gray-400 font-normal">/ 90 min</span></p>
                    </div>
                    <span className="text-gray-300 group-hover:text-green-500 text-xl transition-colors">→</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
