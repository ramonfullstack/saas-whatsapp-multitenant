#!/bin/bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  Deploy Script — SaaS WhatsApp Multitenant
#  Para: Oracle Cloud Free Tier (Ubuntu 22.04+ ARM ou x86)
#
#  Uso:
#    1) Crie a VM na Oracle Cloud
#    2) SSH na VM: ssh ubuntu@SEU_IP
#    3) Clone o repo: git clone SEU_REPO && cd saas-whatsapp-multitenant
#    4) Copie e edite: cp .env.production.example .env.production
#    5) Execute: chmod +x deploy.sh && ./deploy.sh
# ═══════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  SaaS WhatsApp — Deploy Script            ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"

# ─── Verificar .env.production ───────────────────────────────
if [ ! -f ".env.production" ]; then
    echo -e "${RED}[ERRO] Arquivo .env.production não encontrado!${NC}"
    echo "  Copie o template: cp .env.production.example .env.production"
    echo "  Edite com suas credenciais: nano .env.production"
    exit 1
fi

# ─── 1. Instalar Docker (se necessário) ─────────────────────
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[1/5] Instalando Docker...${NC}"
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo -e "${GREEN}  Docker instalado! Pode ser necessário reconectar o SSH.${NC}"
else
    echo -e "${GREEN}[1/5] Docker já instalado ✓${NC}"
fi

# ─── 2. Abrir portas no iptables ─────────────────────────────
echo -e "${YELLOW}[2/5] Configurando firewall...${NC}"
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo netfilter-persistent save 2>/dev/null || true
echo -e "${GREEN}  Portas 80 e 443 liberadas ✓${NC}"

# ─── 3. Build das imagens ────────────────────────────────────
echo -e "${YELLOW}[3/5] Construindo imagens Docker (pode levar 5-10 min)...${NC}"
sudo docker compose -f docker-compose.prod.yml --env-file .env.production build

# ─── 4. Subir os serviços ────────────────────────────────────
echo -e "${YELLOW}[4/5] Iniciando serviços...${NC}"
sudo docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# ─── 5. Verificação ──────────────────────────────────────────
echo -e "${YELLOW}[5/5] Aguardando serviços ficarem saudáveis...${NC}"
sleep 15

DOMAIN=$(grep '^DOMAIN=' .env.production | cut -d'=' -f2)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  DEPLOY CONCLUÍDO!                        ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo -e "  Frontend:      http://${DOMAIN}"
echo -e "  API Backend:   http://${DOMAIN}/api"
echo -e "  WebSocket:     http://${DOMAIN}/socket.io"
echo -e "  Evolution API: http://${DOMAIN}/evolution"
echo ""
echo -e "  ${YELLOW}Status dos containers:${NC}"
sudo docker compose -f docker-compose.prod.yml --env-file .env.production ps
echo ""
echo -e "  ${YELLOW}Logs do backend:${NC}"
sudo docker compose -f docker-compose.prod.yml --env-file .env.production logs backend --tail 10
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  PRÓXIMOS PASSOS:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "  1. Acesse http://${DOMAIN} e faça login"
echo "     (owner@demo.com / 123456)"
echo ""
echo "  2. Para SSL gratuito (se tiver domínio):"
echo "     sudo docker compose -f docker-compose.prod.yml run --rm certbot \\"
echo "       certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
echo "     Depois descomente o bloco HTTPS no nginx/default.conf"
echo "     e reinicie: sudo docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "  3. Logs em tempo real:"
echo "     sudo docker compose -f docker-compose.prod.yml logs -f"
echo ""
