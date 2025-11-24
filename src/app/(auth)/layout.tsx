export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Perelman ATS</h1>
            <p className="text-gray-600 text-sm mt-1">IT Staffing Management System</p>
          </div>

          {/* Content */}
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-6">
          © 2024 Perelman ATS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
