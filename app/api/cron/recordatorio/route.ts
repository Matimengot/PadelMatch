import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Buscar partidos que empiezan en 45-75 minutos, con 4 jugadores confirmados
  const ahora = new Date()
  const en45min = new Date(ahora.getTime() + 45 * 60 * 1000)
  const en75min = new Date(ahora.getTime() + 75 * 60 * 1000)

  const fecha = ahora.toISOString().split('T')[0]

  const { data: partidos } = await supabase
    .from('partidos')
    .select('id, fecha, hora_inicio, canchas(nombre, clubes(nombre))')
    .eq('fecha', fecha)
    .eq('estado', 'activo')
    .eq('jugadores_confirmados', 4)

  if (!partidos?.length) {
    return NextResponse.json({ enviados: 0 })
  }

  // Filtrar los que empiezan en la ventana 45-75min
  const partidosEnVentana = partidos.filter(p => {
    const inicio = new Date(`${p.fecha}T${p.hora_inicio}`)
    return inicio >= en45min && inicio <= en75min
  })

  let enviados = 0

  for (const partido of partidosEnVentana) {
    const { data: jugadores } = await supabase
      .from('partido_jugadores')
      .select('profiles!partido_jugadores_jugador_id_fkey(nombre, email)')
      .eq('partido_id', partido.id)

    if (!jugadores?.length) continue

    const hora = partido.hora_inicio.slice(0, 5)
    const club = (partido.canchas as { nombre: string; clubes: { nombre: string } } | null)?.clubes?.nombre ?? ''
    const cancha = (partido.canchas as { nombre: string } | null)?.nombre ?? ''

    const emails = jugadores
      .map(j => (j.profiles as { nombre: string; email: string } | null))
      .filter((p): p is { nombre: string; email: string } => !!p?.email)

    for (const jugador of emails) {
      const html = `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
          <h2 style="color: #16a34a;">PadelMatch</h2>
          <p>Hola ${jugador.nombre},</p>
          <p>Tu partido empieza en menos de 1 hora. ¡Prepárate!</p>
          <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 20px; font-weight: bold;">${hora}hs</p>
            <p style="margin: 4px 0; color: #555;">${club} · ${cancha}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/partidos/${partido.id}"
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Ver partido →
          </a>
        </div>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PadelMatch <onboarding@resend.dev>',
          to: [jugador.email],
          subject: `Tu partido empieza a las ${hora}hs en ${club}`,
          html,
        }),
      })

      enviados++
    }
  }

  return NextResponse.json({ enviados })
}
