export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-8">
          Welcome to Our Barbershop
        </h1>
        <p className="text-xl mb-8">
          Professional haircuts and styling by expert barbers
        </p>
        <a
          href="/bookings"
          className="bg-black text-white px-8 py-4 rounded-lg text-lg hover:bg-gray-800 transition-colors"
        >
          Book Now
        </a>
      </div>
    </main>
  )
} 