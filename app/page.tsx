import { MapPin, Users, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-5">
        <span className="text-2xl font-bold text-white drop-shadow">PadelMatch</span>
        <div className="flex gap-3">
          <a href="/login" className="text-white/90 hover:text-white font-medium px-4 py-2 transition-colors">
            Iniciar sesión
          </a>
          <a href="/register" className="bg-white text-green-700 font-semibold px-5 py-2 rounded-full hover:bg-green-50 transition-colors shadow">
            Registrarse
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-6 pt-40 pb-32 overflow-hidden bg-green-800">
        {/* Court line pattern */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Center court circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />

        <div className="relative">
          <span className="inline-block bg-white/15 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-white/20">
            Uruguay · Plataforma de padel
          </span>
          <h1 className="text-5xl md:text-6xl font-bold text-white max-w-2xl leading-tight">
            Jugá padel cuando quieras,{' '}
            <span className="text-emerald-300">con quien quieras</span>
          </h1>
          <p className="mt-6 text-xl text-green-100 max-w-xl mx-auto">
            Reservá canchas y encontrá jugadores de tu nivel en los mejores clubes de Uruguay.
          </p>
          <div className="flex gap-4 mt-10 justify-center flex-wrap">
            <a href="/canchas" className="bg-white text-green-700 font-semibold px-8 py-4 rounded-full text-lg hover:bg-green-50 transition-colors shadow-lg">
              Reservar cancha
            </a>
            <a href="/partidos" className="border border-white/50 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/10 transition-colors">
              Buscar partido
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 py-20 max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <MapPin className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Reservá en segundos</h3>
          <p className="text-gray-500">Elegí club, horario y cancha. Sin llamadas, sin esperas.</p>
        </div>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Encontrá tu partido</h3>
          <p className="text-gray-500">Unite a partidos abiertos con jugadores de tu mismo nivel.</p>
        </div>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Seguí tu progreso</h3>
          <p className="text-gray-500">Tu nivel se actualiza con cada partido. Mejorá semana a semana.</p>
        </div>
      </section>

      {/* Clubs CTA */}
      <section className="bg-green-600 text-white text-center px-6 py-16">
        <h2 className="text-3xl font-bold">¿Tenés un club de padel?</h2>
        <p className="mt-3 text-green-100 text-lg max-w-xl mx-auto">
          Sumá tu club a PadelMatch y llenás tus canchas sin esfuerzo.
        </p>
        <a href="/clubes" className="mt-8 inline-block bg-white text-green-600 font-semibold px-8 py-4 rounded-full text-lg hover:bg-green-50 transition-colors">
          Quiero sumar mi club
        </a>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        © 2026 PadelMatch Uruguay
      </footer>
    </div>
  )
}
