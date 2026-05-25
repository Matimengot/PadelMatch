'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Cancha {
  nombre: string
  precio_hora: string
}

export default function ClubRegistroPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [canchas, setCanchas] = useState<Cancha[]>([{ nombre: '', precio_hora: '' }])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function handleInfoClub(e: React.FormEvent) {
    e.preventDefault()
    setPaso(2)
  }

  function agregarCancha() {
    setCanchas([...canchas, { nombre: '', precio_hora: '' }])
  }

  function actualizarCancha(i: number, field: keyof Cancha, value: string) {
    const nuevas = [...canchas]
    nuevas[i][field] = value
    setCanchas(nuevas)
  }

  function eliminarCancha(i: number) {
    if (canchas.length === 1) return
    setCanchas(canchas.filter((_, idx) => idx !== i))
  }

  async function handleFinalizar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: club, error: clubErr } = await supabase
      .from('clubes')
      .insert({ nombre, direccion, admin_id: user.id })
      .select('id')
      .single()

    if (clubErr || !club) {
      setError(clubErr?.message ?? 'Error creando el club')
      setGuardando(false)
      return
    }

    const canchasData = canchas
      .filter(c => c.nombre.trim())
      .map(c => ({
        club_id: club.id,
        nombre: c.nombre.trim(),
        precio_hora: parseFloat(c.precio_hora) || 0,
      }))

    if (canchasData.length > 0) {
      const { error: canchaErr } = await supabase.from('canchas').insert(canchasData)
      if (canchaErr) {
        setError(canchaErr.message)
        setGuardando(false)
        return
      }
    }

    setPaso(3)
    setGuardando(false)
  }

  if (paso === 3) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md text-center">
          <span className="text-2xl font-bold text-green-600 block mb-8">PadelMatch</span>
          <p className="text-5xl mb-4">🎾</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Club registrado!</h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            {nombre} ya está en PadelMatch. Podés gestionar tus reservas desde el panel.
          </p>
          <button
            onClick={() => router.push('/club')}
            className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 transition-colors"
          >
            Ir al panel del club →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-lg">
        <a href="/" className="text-2xl font-bold text-green-600 block mb-8">PadelMatch</a>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map(n => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${n <= paso ? 'bg-green-600' : 'bg-gray-100'}`}
            />
          ))}
        </div>

        {paso === 1 && (
          <form onSubmit={handleInfoClub} className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Registrá tu club</h1>
              <p className="text-gray-500 text-sm">Información básica del establecimiento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del club</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Club Padel Norte"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Ej: Av. Rivera 1234, Montevideo"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              type="submit"
              className="bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors mt-2"
            >
              Continuar →
            </button>
          </form>
        )}

        {paso === 2 && (
          <form onSubmit={handleFinalizar} className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Tus canchas</h1>
              <p className="text-gray-500 text-sm">Agregá las canchas disponibles en {nombre}</p>
            </div>

            <div className="flex flex-col gap-3">
              {canchas.map((c, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Cancha {i + 1}</span>
                    {canchas.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarCancha(i)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={c.nombre}
                    onChange={e => actualizarCancha(i, 'nombre', e.target.value)}
                    placeholder="Nombre (ej: Cancha 1)"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                    <input
                      type="number"
                      value={c.precio_hora}
                      onChange={e => actualizarCancha(i, 'precio_hora', e.target.value)}
                      placeholder="Precio por hora"
                      required
                      min="0"
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={agregarCancha}
              className="border-2 border-dashed border-gray-200 rounded-xl py-3 text-gray-400 font-medium text-sm hover:border-green-400 hover:text-green-600 transition-colors"
            >
              + Agregar otra cancha
            </button>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setPaso(1)}
                className="flex-1 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ← Volver
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {guardando ? 'Registrando...' : 'Registrar club'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
