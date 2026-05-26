$ErrorActionPreference = "Stop"

$env:NODE_ENV = "test"
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "postgresql://postgres:postgres@localhost:5432/procureflow_erp_test?schema=public" }
$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { "test-jwt-secret-change-me" }
$env:JWT_EXPIRES_IN = if ($env:JWT_EXPIRES_IN) { $env:JWT_EXPIRES_IN } else { "15m" }
$env:BCRYPT_SALT_ROUNDS = if ($env:BCRYPT_SALT_ROUNDS) { $env:BCRYPT_SALT_ROUNDS } else { "4" }
$env:PORT = if ($env:PORT) { $env:PORT } else { "4001" }

npm run build -w @procureflow/api
npm run start -w @procureflow/api
