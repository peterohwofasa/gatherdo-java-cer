import { AuthForm } from '@/components/auth-form'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">GatherDO</h1>
          <p className="text-sm text-gray-500">Java Certification Practice</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <AuthForm />
        </div>
      </div>
    </main>
  )
}
