#!/bin/sh

case "$1" in
"-h" | "--help" | "")
    echo "Usage: ./arch-deploy.sh <DOMAIN> <GAPI_CLIENT_ID>"
    exit 0
    ;;
*)
    DOMAIN=$1
    GAPI_CLIENT_ID=$2
    ;;
esac

case "$2" in
"")
    echo "Usage: ./arch-deploy.sh <DOMAIN> <GAPI_CLIENT_ID>"
    exit 0
    ;;
esac

# Install requirements
pacman -S --noconfirm docker nginx certbot certbot-nginx
systemctl enable nginx --now
systemctl enable certbot-renew.timer --now

# Configure nginx
mkdir -p /etc/nginx/sites-enabled /etc/nginx/sites-available
cp --no-clobber /etc/nginx/nginx.conf /etc/nginx/nginx.conf.orig

cat << EOF > /etc/nginx/nginx.conf
worker_processes  1;
events {
    worker_connections  1024;
}
http {
    include            mime.types;
    default_type       application/octet-stream;
    sendfile           on;
    keepalive_timeout  65;

    include sites-enabled/*;
}
EOF

cat << EOF > /etc/nginx/sites-available/cloudtitan_$DOMAIN.conf
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://unix:/var/cloudtitan/socket/http;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
EOF

ln -sf \
    /etc/nginx/sites-available/cloudtitan_$DOMAIN.conf \
    /etc/nginx/sites-enabled/cloudtitan_$DOMAIN.conf

certbot certificates 2> /dev/null \
    | grep $DOMAIN > /dev/null \
    || certbot --nginx -d $DOMAIN

sudo certbot install --cert-name $DOMAIN

docker build -t cloudtitan .

docker kill cloudtitan-server 2> /dev/null
docker container rm cloudtitan-server 2> /dev/null
docker run \
    -d --restart unless-stopped \
    --name cloudtitan-server \
    --user $(id -u http):$(id -g http) \
    --privileged \
    --env PM2_HOME=/tmp/pm2 \
    -v /var/cloudtitan/db:/db \
    -v /var/cloudtitan/socket:/socket \
    cloudtitan \
    --listen "unix:/socket/http" \
    --gapi "$GAPI_CLIENT_ID"

systemctl reload nginx
