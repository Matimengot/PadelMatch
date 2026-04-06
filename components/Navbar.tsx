'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const LINKS = [
  { href: '/canchas',     label: 'Canchas',      key: 'canchas' },
  { href: '/partidos',    label: 'Partidos',      key: 'partidos' },
  { href: '/ranking',     label: 'Ranking',       key: 'ranking' },
  { href: '/mis-partidos', label: 'Mis partidos', key: 'mis-partidos' },
  { href: '/mis-reservas', label: 'Mis reservas', key: 'mis-reservas' },
]

export default function Navbar({ active }: { active?: string }) {
  const [inicial, setInicial] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('nombre, avatar_url').eq('id', user.id).single()
      if (data?.nombre) setInicial(data.nombre.charAt(0).toUpperCase())
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    }
    load()
  }, [])

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
        {/* Logo */}
        <a href="/dashboard" className="text-xl font-bold text-green-600 flex-shrink-0 mr-2">
          PadelMatch
        </a>

        {/* Links — scrollable en mobile */}
        <div className="flex items-center gap-1 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {LINKS.map(link => (
            <a
              key={link.key}
              href={link.href}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                active === link.key
                  ? 'bg-green-50 text-green-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Avatar → Perfil */}
        <a
          href="/perfil"
          className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden transition-all ${
            active === 'perfil' ? 'ring-2 ring-green-500 ring-offset-1' : ''
          }`}
        >
          {avatarUrl
            ? <img src={avatarUrl} alt="perfil" className="w-full h-full object-cover" />
            : <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${active === 'perfil' ? 'bg-green-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>{inicial || '·'}</div>
          }
        </a>
      </div>
    </nav>
  )
}
