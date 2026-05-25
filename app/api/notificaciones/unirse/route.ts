import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { partido_id, nuevo_jugador_id } = await req.json()
  if (!partido_id || !nuevo_jugador_id) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const [{ data: partido }, { data: nuevoJugador }] = await Promise.all([
    supabase
      .from('partidos')
      .select('id, fecha, hora_inicio, creador_id, canchas(nombre, clubes(nombre)), profiles!partidos_creador_id_fkey(nombre, email)')
      .eq('id', partido_id)
      .single(),
    supabase
      .from('profiles')
      .select('nombre')
      .eq('id', nuevo_jugador_id)
      .single(),
  ])

  if (!partido || !nuevoJugador) {
    return NextResponse.json({ ok: true })
  }

  // No notificar si el creador es quien se une
  if (partido.creador_id === nuevo_jugador_id) {
    return NextResponse.json({ ok: true })
  }

  const creador = partido.profiles as { nombre: string; email: string } | null
  if (!creador?.email) {
    return NextResponse.json({ ok: true })
  }

  const fecha = new Date(partido.fecha + 'T00:00:00').toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  const hora = partido.hora_inicio.slice(0, 5)
  const club = (partido.canchas as { nombre: string; clubes: { nombre: string } } | null)?.clubes?.nombre ?? ''
  const cancha = (partido.canchas as { nombre: string } | null)?.nombre ?? ''

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h2 style="color: #16a34a;">PadelMatch</h2>
      <p>Hola ${creador.nombre},</p>
      <p><strong>${nuevoJugador.nombre}</strong> se unió a tu partido:</p>
      <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>${fecha.charAt(0).toUpperCase() + fecha.slice(1)}</strong> · ${hora}hs</p>
        <p style="margin: 4px 0; color: #555;">${club} · ${cancha}</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/partidos/${partido_id}"
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
      to: [creador.email],
      subject: `${nuevoJugador.nombre} se unió a tu partido del ${fecha}`,
      html,
    }),
  })

  return NextResponse.json({ ok: true })
}
