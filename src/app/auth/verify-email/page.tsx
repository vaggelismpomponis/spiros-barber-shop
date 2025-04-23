import Link from 'next/link'

export default function VerifyEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Ελέγξτε το email σας
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Σας έχουμε στείλει ένα σύνδεσμο επαλήθευσης. Παρακαλούμε ελέγξτε το email σας για να συνεχίσετε.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <p className="text-center text-sm text-gray-600">
              Δεν λάβατε email;{' '}
              <Link href="/auth/signup" className="font-medium text-[#1A1A1A] hover:text-gray-800">
                Δοκιμή εγγραφής ξανά
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              Ή{' '}
              <Link href="/auth/signin" className="font-medium text-[#1A1A1A] hover:text-gray-800">
                επιστρέψτε για να συνδεθείτε
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 