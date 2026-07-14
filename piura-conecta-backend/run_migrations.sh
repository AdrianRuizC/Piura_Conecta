#!/usr/bin/env bash
# Ejecutor de migraciones para Piura Conecta (PostgreSQL en Docker)
set -euo pipefail

MIG_DIR="$(dirname "$0")/migrations"
echo "Iniciando migración de base de datos desde $MIG_DIR..."

# Exportamos la contraseña temporalmente para que psql no interrumpa el proceso pidiéndola
export PGPASSWORD="adminpassword"

# Verificamos si la carpeta existe antes de correr el bucle
if [ ! -d "$MIG_DIR" ]; then
  echo "Error: La carpeta de migraciones ($MIG_DIR) no existe."
  exit 1
fi

for f in "$MIG_DIR"/*.sql; do
  # Comprobamos que existan archivos .sql para evitar errores
  [ -e "$f" ] || continue
  
  echo "-> Ejecutando $f"
  # -d: base de datos | -h: host | -p: puerto | -U: usuario | -f: archivo a ejecutar
  psql -d "piuraconecta" -h "localhost" -p 5432 -U "admin" -f "$f"
done

echo "✅ Todas las migraciones fueron aplicadas con éxito."