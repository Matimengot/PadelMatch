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
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-green-600 font-semibold">Canchas</a>
          <a href="/partidos" className="text-gray-600 hover:text-gray-900 font-medium">Partidos</a>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservar cancha</h1>
        <p className="text-gray-500 mb-8">Elegí tu club y horario</p>

        <div className="flex flex-col gap-6">
          {clubes.map(club => (
            <div key={club.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50">
                <h2 className="text-xl font-bold text-gray-900">{club.nombre}</h2>
                <p className="text-gray-400 text-sm mt-1">📍 {club.direccion}</p>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {club.canchas?.map(cancha => (
                  <a
                    key={cancha.id}
                    href={`/canchas/${cancha.id}`}
                    className="border border-gray-100 rounded-xl p-4 hover:border-green-300 hover:bg-green-50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-green-700">{cancha.nombre}</p>
                        <p className="text-green-600 font-bold mt-1">${cancha.precio_hora} <span className="text-gray-400 font-normal text-sm">/ hora</span></p>
                      </div>
                      <span className="text-2xl">🎾</span>
                    </div>
                    <p className="text-sm text-green-600 font-medium mt-3 group-hover:underline">Ver horarios →</p>
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
