'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Cancha {
  id: string
  nombre: string
  precio_hora: number
  clubes: { nombre: string; direccion: string }
}

interface Reserva {
  hora_inicio: string
  hora_fin: string
}

const HORARIOS = ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00', '21:30']

export default function CanchaDetallePage() {
  const { id } = useParams()
  const router = useRouter()
  const [cancha, setCancha] = useState<Cancha | null>(null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reservando, setReservando] = useState(false)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: canchaData } = await supabase
        .from('canchas')
        .select('id, nombre, precio_hora, clubes(nombre, direccion)')
        .eq('id', id)
        .single()

      setCancha(canchaData)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    async function loadReservas() {
      const { data } = await supabase
        .from('reservas')
        .select('hora_inicio, hora_fin')
        .eq('cancha_id', id)
        .eq('fecha', fecha)

      setReservas(data ?? [])
    }
    loadReservas()
  }, [id, fecha])

  function estaOcupado(hora: string) {
    return reservas.some(r => r.hora_inicio === hora + ':00')
  }

  async function handleReservar() {
    if (!horaSeleccionada) return
    setReservando(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [h, m] = horaSeleccionada.split(':').map(Number)
    const totalMin = h * 60 + m + 90
    const horaFin = `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`

    const { error } = await supabase.from('reservas').insert({
      cancha_id: id,
      jugador_id: user.id,
      fecha,
      hora_inicio: horaSeleccionada,
      hora_fin: horaFin,
    })

    if (error) {
      setExito(false)
      alert('Error al reservar: ' + error.message)
      setReservando(false)
      return
    }

    if (!error) {
      setExito(true)
      setHoraSeleccionada(null)
      const { data } = await supabase
        .from('reservas')
        .select('hora_inicio, hora_fin')
        .eq('cancha_id', id)
        .eq('fecha', fecha)
      setReservas(data ?? [])
    }
    setReservando(false)
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
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-2xl font-bold text-green-600">PadelMatch</a>
        <a href="/canchas" className="text-gray-500 hover:text-gray-900 text-sm">← Volver</a>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">{cancha?.nombre}</h1>
        <p className="text-gray-500 mt-1">{cancha?.clubes?.nombre} · 📍 {cancha?.clubes?.direccion}</p>
        <p className="text-green-600 font-bold text-xl mt-2">${cancha?.precio_hora} <span className="text-gray-400 font-normal text-sm">/ 90 min</span></p>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Elegí un horario</h2>
            <input
              type="date"
              value={fecha}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setFecha(e.target.value); setHoraSeleccionada(null) }}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {HORARIOS.map(hora => {
              const ocupado = estaOcupado(hora)
              const seleccionado = horaSeleccionada === hora
              return (
                <button
                  key={hora}
                  disabled={ocupado}
                  onClick={() => setHoraSeleccionada(seleccionado ? null : hora)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                    ocupado
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : seleccionado
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {ocupado ? `${hora} — Ocupado` : hora}
                </button>
              )
            })}
          </div>
        </div>

        {exito && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-4 text-green-700 font-medium text-center">
            ¡Reserva confirmada!
          </div>
        )}

        {horaSeleccionada && (
          <button
            onClick={handleReservar}
            disabled={reservando}
            className="w-full bg-green-600 text-white font-semibold py-4 rounded-2xl mt-4 hover:bg-green-700 transition-colors disabled:opacity-50 text-lg"
          >
            {reservando ? 'Reservando...' : `Reservar ${horaSeleccionada} (90 min) — $${cancha?.precio_hora}`}
          </button>
        )}
      </main>
    </div>
  )
}
