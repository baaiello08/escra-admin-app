import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Escra Admin Portal
        </h1>
        <p className="text-center mb-8 text-gray-600">
          Production-grade admin portal for Escra platform
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/admin/tenants"
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <h2 className="text-xl font-semibold mb-2">Tenants</h2>
            <p className="text-sm text-gray-600">Manage tenants and organizations</p>
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <h2 className="text-xl font-semibold mb-2">Users</h2>
            <p className="text-sm text-gray-600">Manage users and identities</p>
          </Link>
          <Link
            href="/admin/persona"
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <h2 className="text-xl font-semibold mb-2">Persona</h2>
            <p className="text-sm text-gray-600">Identity verification management</p>
          </Link>
          <Link
            href="/admin/indexer"
            className="p-4 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            <h2 className="text-xl font-semibold mb-2">Indexer</h2>
            <p className="text-sm text-gray-600">Escra Indexer controls and monitoring</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

