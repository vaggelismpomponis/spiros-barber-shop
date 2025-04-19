import Link from 'next/link'

export default function VerifyEmail() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Check your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We've sent you a verification link. Please check your email to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <p className="text-center text-sm text-gray-600">
              Didn't receive an email?{' '}
              <Link href="/auth/signup" className="font-medium text-black hover:text-gray-800">
                Try signing up again
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              Or{' '}
              <Link href="/auth/signin" className="font-medium text-black hover:text-gray-800">
                return to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 