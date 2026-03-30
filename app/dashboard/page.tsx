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
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="text-2xl font-bold text-green-600">PadelMatch</span>
        <div className="flex items-center gap-6">
          <a href="/canchas" className="text-gray-600 hover:text-gray-900 font-medium">Canchas</a>
          <a href="/partidos" className="text-gray-600 hover:text-gray-900 font-medium">Partidos</a>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-sm">
            Salir
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Bienvenida */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Hola, {profile?.nombre} 👋
          </h1>
          <p className="text-gray-500 mt-1">¿Listo para jugar hoy?</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-green-600 rounded-2xl p-6">
            <p className="text-sm text-green-100 mb-1">Tu nivel</p>
            <p className="text-5xl font-bold text-white">{profile?.nivel?.toFixed(1)}</p>
            <p className="text-xs text-green-200 mt-1">Escala 1.0 — 7.0</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Partidos jugados</p>
            <p className="text-4xl font-bold text-gray-900">{profile?.partidos_jugados}</p>
            <p className="text-xs text-gray-400 mt-1">Total histórico</p>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/canchas" className="bg-green-600 text-white rounded-2xl p-6 hover:bg-green-700 transition-colors">
            <div className="text-3xl mb-3">🎾</div>
            <h3 className="text-xl font-bold mb-1">Reservar cancha</h3>
            <p className="text-green-100 text-sm">Elegí club, horario y cancha disponible</p>
          </a>
          <a href="/partidos" className="bg-white border border-gray-100 text-gray-900 rounded-2xl p-6 hover:border-green-200 transition-colors">
            <div className="text-3xl mb-3">🤝</div>
            <h3 className="text-xl font-bold mb-1">Buscar partido</h3>
            <p className="text-gray-500 text-sm">Unite a un partido abierto de tu nivel</p>
          </a>
          <a href="/mis-reservas" className="bg-white border border-gray-100 text-gray-900 rounded-2xl p-6 hover:border-green-200 transition-colors">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-xl font-bold mb-1">Mis reservas</h3>
            <p className="text-gray-500 text-sm">Ver tus turnos próximos e historial</p>
          </a>
          <a href="/mis-partidos" className="bg-white border border-gray-100 text-gray-900 rounded-2xl p-6 hover:border-green-200 transition-colors">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-xl font-bold mb-1">Mis partidos</h3>
            <p className="text-gray-500 text-sm">Historial, resultados y próximos partidos</p>
          </a>
          <a href="/perfil" className="bg-white border border-gray-100 text-gray-900 rounded-2xl p-6 hover:border-green-200 transition-colors">
            <div className="text-3xl mb-3">👤</div>
            <h3 className="text-xl font-bold mb-1">Mi perfil</h3>
            <p className="text-gray-500 text-sm">Nivel, evolución, amigos y estadísticas</p>
          </a>
        </div>
      </main>
    </div>
  )
}
