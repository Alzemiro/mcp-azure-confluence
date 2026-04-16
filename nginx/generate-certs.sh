#!/bin/sh
set -e

if [ -f /certs/server.crt ]; then
  echo "Certificado ja existe, a reutilizar."
  exit 0
fi

cat > /tmp/openssl.cnf << EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost
O  = SPMS-MCP
C  = PT

[v3_req]
subjectAltName = DNS:localhost,IP:127.0.0.1
EOF

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout /certs/server.key \
  -out /certs/server.crt \
  -config /tmp/openssl.cnf

echo "Certificado gerado com sucesso."
