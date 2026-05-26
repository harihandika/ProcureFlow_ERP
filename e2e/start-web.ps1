$ErrorActionPreference = "Stop"

$env:NEXT_PUBLIC_API_URL = if ($env:NEXT_PUBLIC_API_URL) { $env:NEXT_PUBLIC_API_URL } else { "http://localhost:4001/api" }

npx next dev apps/web -p 3000
