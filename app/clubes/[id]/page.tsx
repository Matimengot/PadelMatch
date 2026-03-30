'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface Club {
  id: string
  nombre: string
  direccion: string
  descripcion: string
  whatsapp: string
  instagram: string
  canchas: Cancha[]
}

interface Cancha {
  id: string
  nombre: string
  precio_hora: number
}

export default function ClubPublicoPage() {
  const { id } = useParams()
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('clubes')
        .select('id, nombre, direccion, descripcion, whatsapp, instagram, canchas(id, nombre, precio_hora)')
        .eq('id', id)
        .single()
      setClub(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400">Cargando club...</p>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Club no encontrado</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <a href="/" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <a href="/login" className="bg-green-600 text-white font-medium px-5 py-2 rounded-full hover:bg-green-700 transition-colors text-sm">
          Iniciar sesión
        </a>
      </nav>

      {/* Hero del club */}
      <div className="relative text-white px-8 py-16 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1920&q=80)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
        <div className="absolute inset-0 bg-green-900/75" style={{ zIndex: 1 }} />
        <div className="relative max-w-4xl mx-auto" style={{ zIndex: 2 }}>
          <p className="text-green-200 text-sm font-medium mb-2">Club de Padel</p>
          <h1 className="text-5xl font-bold mb-4">{club.nombre}</h1>
          <p className="text-green-100 text-lg flex items-center gap-2 mb-6">
            📍 {club.direccion}
          </p>
          {club.descripcion && (
            <p className="text-green-50 text-lg max-w-2xl leading-relaxed">{club.descripcion}</p>
          )}
          <div className="flex gap-4 mt-8">
            <a href="/canchas" className="bg-white text-green-700 font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition-colors">
              Reservar cancha
            </a>
            {club.whatsapp && (
              <a
                href={`https://wa.me/${club.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-white text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition-colors"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Canchas */}
      <section className="max-w-4xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Nuestras canchas</h2>
        <p className="text-gray-500 mb-8">Reservá online en segundos — disponibilidad en tiempo real</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {club.canchas?.map((cancha) => (
            <a
              key={cancha.id}
              href={`/canchas/${cancha.id}`}
              className="border border-gray-100 rounded-2xl p-6 hover:border-green-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">🎾</div>
                <span className="text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-full">Disponible</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-700">{cancha.nombre}</h3>
              <p className="text-green-600 font-bold text-lg mt-1">
                ${cancha.precio_hora} <span className="text-gray-400 font-normal text-sm">/ 90 min</span>
              </p>
              <p className="text-sm text-green-600 font-medium mt-4 group-hover:underline">Ver horarios disponibles →</p>
            </a>
          ))}
        </div>
      </section>

      {/* Por qué PadelMatch */}
      <section className="bg-gray-50 px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">¿Por qué reservar por PadelMatch?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold text-gray-900 mb-1">Instantáneo</h3>
              <p className="text-gray-500 text-sm">Reservá en segundos, sin llamadas ni esperas</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">🤝</div>
              <h3 className="font-bold text-gray-900 mb-1">Encontrá jugadores</h3>
              <p className="text-gray-500 text-sm">Unite a partidos abiertos de tu nivel</p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="font-bold text-gray-900 mb-1">Desde tu celular</h3>
              <p className="text-gray-500 text-sm">Gestioná todo desde la app, cuando quieras</p>
            </div>
          </div>
        </div>
      </section>

      {club.instagram && (
        <section className="max-w-4xl mx-auto px-8 py-12 text-center">
          <p className="text-gray-500 mb-3">Seguinos en Instagram</p>
          <a
            href={`https://instagram.com/${club.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 font-bold text-xl hover:underline"
          >
            @{club.instagram}
          </a>
        </section>
      )}

      <footer className="border-t border-gray-100 text-center py-8 text-gray-400 text-sm">
        © 2026 PadelMatch Uruguay · <a href="/" className="hover:text-green-600">Volver al inicio</a>
      </footer>
    </div>
  )
}
