export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex items-center justify-center">
        <div className="absolute inset-0 w-full h-full">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: "url('/hero-barber.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
              Welcome to Our Barbershop
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-200 mb-8 sm:mb-10">
              Professional haircuts and styling by expert barbers
            </p>
            
            {/* Buttons Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              <a
                href="/bookings"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 
                         bg-white text-black text-base sm:text-lg font-semibold rounded-lg 
                         hover:bg-gray-100 transition-colors duration-300 min-w-[160px]"
              >
                Book Now
              </a>
              <a
                href="/services"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 
                         border-2 border-white text-white text-base sm:text-lg font-semibold rounded-lg 
                         hover:bg-white/10 transition-colors duration-300 min-w-[160px]"
              >
                Our Services
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
} 