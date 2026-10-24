#!/bin/sh
set -eu

certificate_dir=/etc/nginx/ssl
mkdir -p "$certificate_dir"

if [ ! -s "$certificate_dir/server.key" ] || [ ! -s "$certificate_dir/server.crt" ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$certificate_dir/server.key" \
    -out "$certificate_dir/server.crt" \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  chmod 600 "$certificate_dir/server.key"
fi