'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Profile {
  nombre: string
  nivel: number
  partidos_jugados: number
  onboarding_completado: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('nombre, nivel, partidos_jugados, onboarding_completado')
        .eq('id', user.id)
        .single()

      if (data && !data.onboarding_completado) {
        router.push('/onboarding')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-8 py-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-green-600">PadelMatch</span>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Canchas</a>
          <a href="/partidos" className="text-gray-500 hover:text-gray-900 font-medium transition-colors">Partidos</a>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">Salir</button>
          <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {profile?.nombre?.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Banner bienvenida + stats */}
        <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-2xl p-8 mb-8 text-white shadow-sm">
          <h1 className="text-3xl font-bold">Hola, {profile?.nombre} 👋</h1>
          <p className="text-green-100 mt-1">¿Listo para jugar hoy?</p>
          <div className="flex gap-10 mt-6">
            <div>
              <p className="text-green-200 text-sm font-medium">Tu nivel</p>
              <p className="text-5xl font-bold mt-1">{profile?.nivel?.toFixed(1)}</p>
              <p className="text-green-300 text-xs mt-1">Escala 1.0 — 7.0</p>
            </div>
            <div className="border-l border-green-400 pl-10">
              <p className="text-green-200 text-sm font-medium">Partidos jugados</p>
              <p className="text-5xl font-bold mt-1">{profile?.partidos_jugados}</p>
              <p className="text-green-300 text-xs mt-1">Total histórico</p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/canchas" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-green-200 transition-colors">🎾</div>
            <h3 className="text-lg font-bold text-gray-900">Reservar cancha</h3>
            <p className="text-gray-400 text-sm mt-1">Elegí club, horario y cancha disponible</p>
          </a>
          <a href="/partidos" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-blue-200 transition-colors">🤝</div>
            <h3 className="text-lg font-bold text-gray-900">Buscar partido</h3>
            <p className="text-gray-400 text-sm mt-1">Unite a un partido abierto de tu nivel</p>
          </a>
          <a href="/mis-reservas" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-purple-200 transition-colors">📅</div>
            <h3 className="text-lg font-bold text-gray-900">Mis reservas</h3>
            <p className="text-gray-400 text-sm mt-1">Ver tus turnos próximos e historial</p>
          </a>
          <a href="/mis-partidos" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-yellow-200 transition-colors">🏆</div>
            <h3 className="text-lg font-bold text-gray-900">Mis partidos</h3>
            <p className="text-gray-400 text-sm mt-1">Historial, resultados y próximos partidos</p>
          </a>
          <a href="/perfil" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-gray-200 transition-colors">👤</div>
            <h3 className="text-lg font-bold text-gray-900">Mi perfil</h3>
            <p className="text-gray-400 text-sm mt-1">Nivel, evolución, amigos y estadísticas</p>
          </a>
        </div>
      </main>
    </div>
  )
}
