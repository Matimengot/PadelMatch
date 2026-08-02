'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { CalendarDays, Trophy, User, Building2, MapPin, Users, BarChart2 } from 'lucide-react'
import { motion } from 'motion/react'

interface Profile {
  nombre: string
  nivel: number
  partidos_jugados: number
  onboarding_completado: boolean
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="rounded-2xl p-8 mb-8 bg-gray-200 animate-pulse h-44" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
              <div className="h-5 bg-gray-200 rounded w-2/5 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [esAdminClub, setEsAdminClub] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data }, { data: club }] = await Promise.all([
        supabase
          .from('profiles')
          .select('nombre, nivel, partidos_jugados, onboarding_completado')
          .eq('id', user.id)
          .single(),
        supabase
          .from('clubes')
          .select('id')
          .eq('admin_id', user.id)
          .maybeSingle(),
      ])

      setEsAdminClub(!!club)

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

  if (loading) return <DashboardSkeleton />

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Banner bienvenida + stats */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 rounded-2xl p-8 mb-8 text-white shadow-lg overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
          <div className="relative">
            <h1 className="text-3xl font-bold">Hola, {profile?.nombre}</h1>
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
        </motion.div>

        {/* Acciones */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <motion.a variants={cardVariant} href="/canchas" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Reservar cancha</h3>
            <p className="text-gray-400 text-sm mt-1">Elegí club, horario y cancha disponible</p>
          </motion.a>

          <motion.a variants={cardVariant} href="/partidos" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-blue-200 transition-all group">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Buscar partido</h3>
            <p className="text-gray-400 text-sm mt-1">Unite a un partido abierto de tu nivel</p>
          </motion.a>

          <motion.a variants={cardVariant} href="/mis-reservas" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-purple-200 transition-all group">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <CalendarDays className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Mis reservas</h3>
            <p className="text-gray-400 text-sm mt-1">Ver tus turnos próximos e historial</p>
          </motion.a>

          <motion.a variants={cardVariant} href="/mis-partidos" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-yellow-200 transition-all group">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
              <Trophy className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Mis partidos</h3>
            <p className="text-gray-400 text-sm mt-1">Historial, resultados y próximos partidos</p>
          </motion.a>

          <motion.a variants={cardVariant} href="/perfil" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all group">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-gray-200 transition-colors">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Mi perfil</h3>
            <p className="text-gray-400 text-sm mt-1">Nivel, evolución, amigos y estadísticas</p>
          </motion.a>

          <motion.a variants={cardVariant} href="/ranking" className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-amber-200 transition-all group">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-200 transition-colors">
              <BarChart2 className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Ranking</h3>
            <p className="text-gray-400 text-sm mt-1">Los mejores jugadores de PadelMatch</p>
          </motion.a>

          <motion.a
            variants={cardVariant}
            href={esAdminClub ? '/club' : '/club/registro'}
            className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md hover:border-green-200 transition-all group md:col-span-2"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors flex-shrink-0">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {esAdminClub ? 'Panel del club' : '¿Tenés un club?'}
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {esAdminClub ? 'Gestioná reservas, canchas y estadísticas' : 'Registrá tu club y empezá a recibir reservas'}
                </p>
              </div>
            </div>
          </motion.a>
        </motion.div>
      </main>
    </div>
  )
}
