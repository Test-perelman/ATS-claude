export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-100 to-purple-300 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Shining gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-20 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-purple-100 backdrop-blur-sm">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-amber-600 bg-clip-text text-transparent">Perelman ATS</h1>
            <p className="text-purple-600 text-sm mt-1 font-medium">IT Staffing Management System</p>
          </div>

          {/* Content */}
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-purple-700 text-sm mt-6 font-medium">
          © 2024 Perelman ATS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
