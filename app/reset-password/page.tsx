'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')
  const [sesionValida, setSesionValida] = useState<boolean | null>(null)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSesionValida(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSesionValida(true)
      else setSesionValida((v) => v ?? false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setListo(true)
      setLoading(false)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-3xl font-bold text-green-600">PadelMatch</a>
          <p className="text-gray-400 text-sm mt-1">Uruguay</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sesionValida === false ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Link inválido o vencido</h1>
              <p className="text-gray-500">Pedí un nuevo link de recuperación.</p>
              <a href="/recuperar" className="block text-center text-green-600 font-semibold hover:underline mt-6">
                Recuperar contraseña
              </a>
            </>
          ) : listo ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Listo!</h1>
              <p className="text-gray-500">Tu contraseña se actualizó. Te llevamos a tu dashboard...</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva contraseña</h1>
              <p className="text-gray-400 mb-8">Elegí una contraseña nueva para tu cuenta</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña nueva</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white font-semibold py-3.5 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 mt-2 shadow-sm"
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
