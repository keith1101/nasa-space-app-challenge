#!/bin/bash
# NASA FIRMS Harmonization Platform - Launcher & Hosting Script

cd "$(dirname "$0")"

echo "======================================================="
echo "  🛰️ NASA FIRMS - Hotspot Harmonization Platform"
echo "======================================================="

# Check if port 8000 is active
if ! ss -tulpn 2>/dev/null | grep -q ":8000 "; then
    echo "▶ Khởi động máy chủ backend (Port 8000)..."
    python3 backend/server.py &
    sleep 2
else
    echo "✓ Máy chủ backend đã đang chạy tại http://localhost:8000"
fi

echo ""
echo "▶ Mở máy chủ ra Internet (Public Tunnel)..."
echo "-------------------------------------------------------"
PUBLIC_IP=$(curl -s https://loca.lt/mytunnelpassword || echo "14.187.51.191")
echo "🔑 Mật khẩu mở khóa LocalTunnel (Tunnel Password): $PUBLIC_IP"
echo "-------------------------------------------------------"

npx --yes localtunnel --port 8000
