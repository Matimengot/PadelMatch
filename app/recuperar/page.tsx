'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setEnviado(true)
      setLoading(false)
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
          {enviado ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Revisá tu email</h1>
              <p className="text-gray-500">
                Si <strong>{email}</strong> tiene una cuenta en PadelMatch, te enviamos un link para crear una nueva contraseña.
              </p>
              <a href="/login" className="block text-center text-green-600 font-semibold hover:underline mt-6">
                Volver a iniciar sesión
              </a>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Recuperar contraseña</h1>
              <p className="text-gray-400 mb-8">Te enviamos un link para crear una nueva</p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
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
                  {loading ? 'Enviando...' : 'Enviar link'}
                </button>
              </form>

              <p className="text-center text-gray-400 text-sm mt-6">
                <a href="/login" className="text-green-600 font-semibold hover:underline">
                  Volver a iniciar sesión
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
