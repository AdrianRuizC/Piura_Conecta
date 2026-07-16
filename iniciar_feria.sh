#!/bin/bash
# 1. Levantar el Hotspot
nmcli device wifi hotspot ifname wlp3s0 ssid PIURA_CONECTA password "feria2026"

# 2. Asegurar reglas de firewall (limpiamos y abrimos puertos)
sudo iptables -F
sudo iptables -P INPUT ACCEPT
sudo iptables -I INPUT -p tcp --dport 5173 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT

echo "Red y Firewall listos. Conecten los celulares a PIURA_CONECTA."
