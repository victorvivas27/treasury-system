#!/bin/bash

echo "🚀 Iniciando pruebas completas..."

# 1. Iniciar backend
echo "📦 Iniciando backend..."
cd backend
source ../backend/.env && ./gradlew bootRun > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 2. Esperar que el backend esté listo
echo "⏳ Esperando que el backend esté listo..."
timeout 60 bash -c 'while ! curl -s http://localhost:8080/actuator/health; do sleep 2; done'
if [ $? -ne 0 ]; then
    echo "❌ Backend no inició correctamente"
    cat backend/backend.log
    exit 1
fi
echo "✅ Backend listo!"

# 3. Ejecutar pruebas
echo "🧪 Ejecutando pruebas de API..."
cd api-tests
echo "Url_Base=http://localhost:8080" > .env
bru run "./📁 Apoderado" --env .env
TEST_RESULT=$?
cd ..

# 4. Detener backend
echo "🛑 Deteniendo backend..."
kill $BACKEND_PID 2>/dev/null || true

# 5. Mostrar resultado final
if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ ✅ ✅ ¡Todas las pruebas pasaron! ✅ ✅ ✅"
    exit 0
else
    echo "❌ ❌ ❌ Algunas pruebas fallaron ❌ ❌ ❌"
    exit 1
fi
