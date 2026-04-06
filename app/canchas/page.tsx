'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

const CLUB_FOTOS: Record<string, string> = {
  'Boss Padel Carrasco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Outdoor_padel_court_Mariestad.jpg/800px-Outdoor_padel_court_Mariestad.jpg',
  'Indoor Padel Malvin': 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Mobile_padel_court_in_Stockholm_2021_-_01.jpg',
  'Indoor Padel Nuevo Centro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Padel_court.jpg/800px-Padel_court.jpg',
  'World Padel Center': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Club_Kingswood_Padel.jpg/960px-Club_Kingswood_Padel.jpg',
  'Top Padel Fit Center': 'https://toppadelfitcenter.com/wp-content/uploads/2024/06/Full-panoramic-scaled.webp',
}

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
      <Navbar active="canchas" />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Reservar cancha</h1>
        <p className="text-gray-400 mb-8">Elegí tu club y horario</p>

        <div className="flex flex-col gap-6">
          {clubes.map(club => (
            <div key={club.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="relative h-44 overflow-hidden">
                {CLUB_FOTOS[club.nombre] ? (
                  <img
                    src={CLUB_FOTOS[club.nombre]}
                    alt={club.nombre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-green-600 to-green-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 px-6 py-4 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{club.nombre}</h2>
                    <p className="text-white/70 text-sm mt-0.5">📍 {club.direccion}</p>
                  </div>
                  <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full">
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
