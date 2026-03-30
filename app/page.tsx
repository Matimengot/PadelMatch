export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-2xl font-bold text-green-600">PadelMatch</span>
        <div className="flex gap-4">
          <a href="/login" className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2">
            Iniciar sesión
          </a>
          <a href="/register" className="bg-green-600 text-white font-medium px-5 py-2 rounded-full hover:bg-green-700 transition-colors">
            Registrarse
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 bg-gradient-to-b from-green-50 to-white">
        <h1 className="text-5xl font-bold text-gray-900 max-w-2xl leading-tight">
          Jugá padel cuando quieras,<br />
          <span className="text-green-600">con quien quieras</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-xl">
          Reservá canchas y encontrá jugadores de tu nivel en los mejores clubes de Uruguay.
        </p>
        <div className="flex gap-4 mt-10">
          <a href="/canchas" className="bg-green-600 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-green-700 transition-colors">
            Reservar cancha
          </a>
          <a href="/partidos" className="border border-green-600 text-green-600 font-semibold px-8 py-4 rounded-full text-lg hover:bg-green-50 transition-colors">
            Buscar partido
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-8 py-20 max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">
            🎾
          </div>
          <h3 className="text-xl font-bold text-gray-900">Reservá en segundos</h3>
          <p className="text-gray-500">Elegí club, horario y cancha. Sin llamadas, sin esperas.</p>
        </div>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">
            🤝
          </div>
          <h3 className="text-xl font-bold text-gray-900">Encontrá tu partido</h3>
          <p className="text-gray-500">Unite a partidos abiertos con jugadores de tu mismo nivel.</p>
        </div>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">
            📈
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
  );
}
