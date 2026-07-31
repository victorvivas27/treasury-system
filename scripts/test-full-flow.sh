#!/bin/bash

echo "🚀 Iniciando pruebas completas..."

BACKEND_PID=""

cleanup() {
  echo "🛑 Deteniendo backend..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

# 1. Iniciar backend
echo "📦 Iniciando backend..."
cd backend || exit 1

set -a
source .env
set +a

./gradlew bootRun > backend.log 2>&1 &
BACKEND_PID=$!

cd ..

# 2. Esperar backend
echo "⏳ Esperando backend..."
timeout 60 bash -c 'until curl -s http://localhost:5055/tesoreria/api/v1/auth/me > /dev/null; do sleep 2; done'

if [ $? -ne 0 ]; then
  echo "❌ Backend no inició correctamente"
  cat backend/backend.log
  exit 1
fi

echo "✅ Backend listo!"

# 3. Crear environment de Bruno
echo "⚙️ Preparando environment Bruno..."
mkdir -p api-tests/environments

cat > api-tests/environments/local.yml <<EOF
vars:
  Url_Base: http://localhost:5055/tesoreria/api/v1
EOF

# 4. Ejecutar pruebas
echo "🧪 Ejecutando pruebas de API..."
cd api-tests || exit 1

pnpm dlx @usebruno/cli run "./apoderado" --env local
TEST_RESULT=$?

cd ..

# 5. Resultado final
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ ✅ ✅ ¡Todas las pruebas pasaron! ✅ ✅ ✅"
  exit 0
else
  echo "❌ ❌ ❌ Algunas pruebas fallaron ❌ ❌ ❌"
  exit 1
fi
