'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

interface Jugador {
  jugador_id: string
  equipo: number
  profiles: { nombre: string }
}

interface Partido {
  id: string
  fecha: string
  hora_inicio: string
  tipo: string
  sets: string | null
  sets_propuesto_equipo1: string | null
  sets_propuesto_equipo2: string | null
  confirmado_equipo1: boolean
  confirmado_equipo2: boolean
  canchas: { nombre: string; clubes: { nombre: string } }
}

interface Set {
  eq1: string
  eq2: string
}

export default function ResultadoPartidoPage() {
  const { id } = useParams()
  const router = useRouter()
  const [partido, setPartido] = useState<Partido | null>(null)
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [miEquipo, setMiEquipo] = useState<number | null>(null)
  const [sets, setSets] = useState<Set[]>([{ eq1: '', eq2: '' }, { eq1: '', eq2: '' }])
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [yaConfirmado, setYaConfirmado] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: p } = await supabase
        .from('partidos')
        .select('id, fecha, hora_inicio, tipo, sets, sets_propuesto_equipo1, sets_propuesto_equipo2, confirmado_equipo1, confirmado_equipo2, canchas(nombre, clubes(nombre))')
        .eq('id', id)
        .single()

      const { data: j } = await supabase
        .from('partido_jugadores')
        .select('jugador_id, equipo, profiles(nombre)')
        .eq('partido_id', id)

      if (p) setPartido(p)
      if (j) {
        // Asignar equipos si no están asignados (primeros 2 = equipo 1, últimos 2 = equipo 2)
        const conEquipos = j.map((jug, i) => ({ ...jug, equipo: jug.equipo ?? (i < 2 ? 1 : 2) }))
        setJugadores(conEquipos)
        const yo = conEquipos.find(jug => jug.jugador_id === user.id)
        if (yo) setMiEquipo(yo.equipo)
      }

      if (p?.sets) setYaConfirmado(true)

      setLoading(false)
    }
    load()
  }, [id, router])

  function setSetsValue(idx: number, campo: 'eq1' | 'eq2', valor: string) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [campo]: valor } : s))
  }

  function agregarSet() {
    if (sets.length < 3) setSets(prev => [...prev, { eq1: '', eq2: '' }])
  }

  function setsToString(): string {
    return sets.filter(s => s.eq1 !== '' && s.eq2 !== '').map(s => `${s.eq1}-${s.eq2}`).join(', ')
  }

  function determinarGanador(setsStr: string, equipo: number): string {
    const partes = setsStr.split(',').map(s => s.trim())
    let gana1 = 0, gana2 = 0
    for (const p of partes) {
      const [a, b] = p.split('-').map(Number)
      if (a > b) gana1++
      else gana2++
    }
    if (equipo === 1) return gana1 > gana2 ? 'victoria' : 'derrota'
    return gana2 > gana1 ? 'victoria' : 'derrota'
  }

  async function handleConfirmar() {
    if (!miEquipo || !partido || !userId) return
    setGuardando(true)

    const setsStr = setsToString()
    if (!setsStr) { alert('Ingresá al menos un set'); setGuardando(false); return }

    const campo = miEquipo === 1 ? 'sets_propuesto_equipo1' : 'sets_propuesto_equipo2'
    const confirmadoCampo = miEquipo === 1 ? 'confirmado_equipo1' : 'confirmado_equipo2'
    const otroSets = miEquipo === 1 ? partido.sets_propuesto_equipo2 : partido.sets_propuesto_equipo1
    const otroConfirmado = miEquipo === 1 ? partido.confirmado_equipo2 : partido.confirmado_equipo1

    await supabase.from('partidos').update({
      [campo]: setsStr,
      [confirmadoCampo]: true,
    }).eq('id', id)

    // Si el otro equipo ya ingresó el mismo resultado → confirmar
    if (otroConfirmado && otroSets === setsStr) {
      await supabase.from('partidos').update({ sets: setsStr, estado: 'completado' }).eq('id', id)

      // Crear resultados para cada jugador
      const inserts = jugadores.map(j => ({
        partido_id: partido.id,
        jugador_id: j.jugador_id,
        resultado: determinarGanador(setsStr, j.equipo),
        nivel_anterior: 3.0,
        nivel_nuevo: 3.0,
        sets: setsStr,
      }))
      await supabase.from('resultados_partidos').insert(inserts)
      setYaConfirmado(true)
    }

    setGuardando(false)
    router.push('/mis-partidos')
  }

  const equipo1 = jugadores.filter(j => j.equipo === 1)
  const equipo2 = jugadores.filter(j => j.equipo === 2)

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
        <a href="/mis-partidos" className="text-gray-500 hover:text-gray-900 text-sm">← Volver</a>
      </nav>

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingresar resultado</h1>
        <p className="text-gray-500 mb-8">
          {partido?.canchas?.nombre} · {partido?.canchas?.clubes?.nombre} · {partido?.fecha}
        </p>

        {yaConfirmado ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-green-700 font-bold text-lg">Resultado confirmado</p>
            <p className="text-green-600 text-sm mt-1">{partido?.sets}</p>
          </div>
        ) : (
          <>
            {/* Equipos */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-xl ${miEquipo === 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className="text-xs font-bold text-gray-500 mb-2">EQUIPO 1 {miEquipo === 1 && '(vos)'}</p>
                  {equipo1.map(j => (
                    <p key={j.jugador_id} className="text-sm font-medium text-gray-900">{j.profiles?.nombre}</p>
                  ))}
                </div>
                <div className={`p-3 rounded-xl ${miEquipo === 2 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <p className="text-xs font-bold text-gray-500 mb-2">EQUIPO 2 {miEquipo === 2 && '(vos)'}</p>
                  {equipo2.map(j => (
                    <p key={j.jugador_id} className="text-sm font-medium text-gray-900">{j.profiles?.nombre}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingreso de sets */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Marcador</h2>
              <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-gray-400 font-medium text-center">
                <span>Equipo 1</span>
                <span>Set</span>
                <span>Equipo 2</span>
              </div>
              {sets.map((s, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 mb-3 items-center">
                  <input
                    type="number" min="0" max="7"
                    value={s.eq1}
                    onChange={e => setSetsValue(i, 'eq1', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-center text-gray-400 font-bold">Set {i + 1}</p>
                  <input
                    type="number" min="0" max="7"
                    value={s.eq2}
                    onChange={e => setSetsValue(i, 'eq2', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
              {sets.length < 3 && (
                <button onClick={agregarSet} className="text-green-600 text-sm font-medium hover:underline mt-2">
                  + Agregar set
                </button>
              )}
            </div>

            {partido?.sets_propuesto_equipo1 && miEquipo === 2 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 text-sm text-orange-700">
                El equipo 1 ingresó: <strong>{partido.sets_propuesto_equipo1}</strong>. Si es correcto, ingresá el mismo marcador para confirmar.
              </div>
            )}
            {partido?.sets_propuesto_equipo2 && miEquipo === 1 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4 text-sm text-orange-700">
                El equipo 2 ingresó: <strong>{partido.sets_propuesto_equipo2}</strong>. Si es correcto, ingresá el mismo marcador para confirmar.
              </div>
            )}

            <button
              onClick={handleConfirmar}
              disabled={guardando}
              className="w-full bg-green-600 text-white font-semibold py-4 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-lg"
            >
              {guardando ? 'Guardando...' : 'Confirmar resultado'}
            </button>
          </>
        )}
      </main>
    </div>
  )
}
