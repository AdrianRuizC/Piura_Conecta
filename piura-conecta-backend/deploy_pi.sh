#!/usr/bin/env bash
# Script mínimo para preparar Raspberry Pi / Ubuntu server para Piura Conecta demo
set -euo pipefail

echo "Preparando sistema para Piura Conecta..."
sudo apt update
sudo apt install -y git curl build-essential

# Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL client (DB puede residir en otro equipo)
sudo apt install -y postgresql-client

# Clonar repo y preparar app
if [ ! -d piura-conecta ]; then
  git clone https://github.com/tu_org/piura-conecta.git
fi
cd piura-conecta/piura-conecta-backend
npm install
# Ejecutar migraciones (asume psql accesible y credenciales en env)
chmod +x run_migrations.sh
./run_migrations.sh

# Instalar pm2 para ejecutar en background
sudo npm install -g pm2
pm2 start server.js --name piura-backend
pm2 save

echo "Despliegue mínimo completado. Revisa pm2 logs con 'pm2 logs piura-backend'"
