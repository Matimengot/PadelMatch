'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PREGUNTAS = [
  {
    id: 'experiencia',
    pregunta: '¿Cuánto tiempo llevás jugando padel?',
    opciones: [
      { label: 'Nunca jugué', valor: 0 },
      { label: 'Menos de 6 meses', valor: 1 },
      { label: '6 meses a 1 año', valor: 2 },
      { label: '1 a 3 años', valor: 3 },
      { label: 'Más de 3 años', valor: 4 },
    ],
  },
  {
    id: 'frecuencia',
    pregunta: '¿Con qué frecuencia jugás?',
    opciones: [
      { label: 'Nunca o muy rara vez', valor: 0 },
      { label: 'Una vez al mes', valor: 1 },
      { label: 'Una vez a la semana', valor: 2 },
      { label: '2 a 3 veces por semana', valor: 3 },
      { label: 'Casi todos los días', valor: 4 },
    ],
  },
  {
    id: 'nivel_percibido',
    pregunta: '¿Cómo describirías tu juego?',
    opciones: [
      { label: 'Estoy aprendiendo los básicos', valor: 0 },
      { label: 'Puedo sostener peloteos', valor: 1.5 },
      { label: 'Juego bien en un nivel amateur', valor: 3 },
      { label: 'Soy un jugador avanzado', valor: 4.5 },
      { label: 'Juego a nivel muy alto / competitivo', valor: 6 },
    ],
  },
  {
    id: 'torneos',
    pregunta: '¿Participás en torneos o ligas?',
    opciones: [
      { label: 'Nunca', valor: 0 },
      { label: 'Alguna vez, de forma recreativa', valor: 0.5 },
      { label: 'Ocasionalmente en torneos locales', valor: 1 },
      { label: 'Regularmente en torneos', valor: 1.5 },
      { label: 'Soy jugador federado o profesional', valor: 2 },
    ],
  },
]

function calcularNivel(respuestas: Record<string, number>): number {
  const exp = respuestas['experiencia'] ?? 0
  const frec = respuestas['frecuencia'] ?? 0
  const percibido = respuestas['nivel_percibido'] ?? 0
  const torneos = respuestas['torneos'] ?? 0

  // Peso: nivel percibido tiene más peso (50%), resto se distribuye
  const puntaje = percibido * 0.5 + (exp / 4) * 2 * 0.2 + (frec / 4) * 2 * 0.2 + torneos * 0.3
  const nivel = Math.min(7.0, Math.max(1.0, parseFloat((1 + puntaje).toFixed(1))))
  return nivel
}

function descripcionNivel(nivel: number): string {
  if (nivel < 2) return 'Principiante'
  if (nivel < 3) return 'Iniciado'
  if (nivel < 4) return 'Intermedio'
  if (nivel < 5) return 'Avanzado'
  if (nivel < 6) return 'Muy avanzado'
  return 'Competitivo'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<string, number>>({})
  const [guardando, setGuardando] = useState(false)
  const [nivelCalculado, setNivelCalculado] = useState<number | null>(null)

  const preguntaActual = PREGUNTAS[paso]
  const totalPasos = PREGUNTAS.length
  const progreso = ((paso) / totalPasos) * 100

  function handleOpcion(valor: number) {
    const nuevas = { ...respuestas, [preguntaActual.id]: valor }
    setRespuestas(nuevas)

    if (paso < totalPasos - 1) {
      setTimeout(() => setPaso(paso + 1), 200)
    } else {
      guardarNivel(nuevas)
    }
  }

  async function guardarNivel(resp: Record<string, number>) {
    setGuardando(true)
    const nivel = calcularNivel(resp)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Upsert: crea el perfil si no existe, o lo actualiza si ya existe
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      nombre: user.user_metadata?.nombre ?? 'Jugador',
      nivel,
      onboarding_completado: true,
    })

    if (error) {
      alert('Error guardando nivel: ' + error.message)
      setGuardando(false)
      return
    }

    setNivelCalculado(nivel)
    setGuardando(false)
  }

  if (guardando) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🎾</p>
          <p className="text-xl font-bold text-gray-900">Calculando tu nivel...</p>
        </div>
      </div>
    )
  }

  if (nivelCalculado !== null) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md text-center">
          <span className="text-2xl font-bold text-green-600 block mb-8">PadelMatch</span>
          <p className="text-5xl mb-4">🎾</p>
          <p className="text-gray-500 text-lg mb-2">Tu nivel inicial es</p>
          <p className="text-7xl font-bold text-green-600 my-4">{nivelCalculado.toFixed(1)}</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">{descripcionNivel(nivelCalculado)}</p>
          <p className="text-gray-400 text-sm mb-8 max-w-xs mx-auto">
            Tu nivel se irá ajustando automáticamente con cada partido competitivo que juegues.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 transition-colors text-lg"
          >
            Empezar a jugar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <span className="text-2xl font-bold text-green-600">PadelMatch</span>
          <p className="text-gray-400 text-sm mt-1">Configuración inicial</p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
          <div
            className="bg-green-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progreso}%` }}
          />
        </div>

        {/* Pregunta */}
        <div className="mb-8">
          <p className="text-xs text-gray-400 font-medium mb-2">Pregunta {paso + 1} de {totalPasos}</p>
          <h2 className="text-2xl font-bold text-gray-900">{preguntaActual.pregunta}</h2>
        </div>

        {/* Opciones */}
        <div className="flex flex-col gap-3">
          {preguntaActual.opciones.map(op => (
            <button
              key={op.label}
              onClick={() => handleOpcion(op.valor)}
              className={`text-left px-5 py-4 rounded-xl border-2 font-medium transition-all hover:border-green-400 hover:bg-green-50 ${
                respuestas[preguntaActual.id] === op.valor
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-100 text-gray-700'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Volver */}
        {paso > 0 && (
          <button
            onClick={() => setPaso(paso - 1)}
            className="mt-6 text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            ← Volver
          </button>
        )}
      </div>
    </div>
  )
}
