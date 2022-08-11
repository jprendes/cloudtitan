# Use the oldets debian published with node
FROM node:16-buster

# Install bubblewrap
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get -yq update && \
    apt-get -yq install bubblewrap && \
    npm install --location=global pm2 && \
    pm2 install pm2-logrotate

ENV XDG_CONFIG_HOME=/config

COPY server.json /config/cloudtitan/server.json
COPY entry.sh /entry.sh
RUN chmod a+x /entry.sh

RUN mkdir -p /ui /dl /db

COPY ui /tmp/build/ui
RUN npm --prefix /tmp/build/ui i && \
    npm --prefix /tmp/build/ui run build && \
    mv /tmp/build/ui/dist/* /ui/

COPY common /tmp/build/common
RUN npm --prefix /tmp/build/common i

COPY client /tmp/build/client
RUN npm --prefix /tmp/build/client i && \
    npm --prefix /tmp/build/client run build

COPY worker /tmp/build/worker
RUN npm --prefix /tmp/build/worker i && \
    npm --prefix /tmp/build/worker run build

COPY install-client-template.sh /tmp/build/
COPY build-install-script.sh /tmp/build/

RUN /tmp/build/build-install-script.sh /tmp/build/install-client-template.sh /tmp/build/dist/cloudtitan.gz /tmp/build/dist/install.sh

RUN mv /tmp/build/dist/* /dl/

RUN rm -Rf /tmp/build

COPY common /common
COPY server /server
RUN npm --prefix /common i --omit=dev && \
    npm --prefix /server i --omit=dev

ENTRYPOINT ["/entry.sh"]
