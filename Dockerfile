FROM archlinux

RUN pacman -Sy --noconfirm bubblewrap npm clang rust make pm2 && pm2 install pm2-logrotate

ENV UI_ROOT=/ui
ENV DL_ROOT=/dl
ENV DB_ROOT=/db

RUN mkdir -p $UI_ROOT $DL_ROOT $DB_ROOT 

COPY ui /tmp/build/ui
RUN npm --prefix /tmp/build/ui i && \
    npm --prefix /tmp/build/ui run build && \
    mv /tmp/build/ui/dist/* $UI_ROOT/

COPY common /tmp/build/common
RUN npm --prefix /tmp/build/common i

COPY client /tmp/build/client
RUN npm --prefix /tmp/build/client i && \
    npm --prefix /tmp/build/client run build

COPY worker /tmp/build/worker
RUN npm --prefix /tmp/build/worker i && \
    npm --prefix /tmp/build/worker run build

RUN mv /tmp/build/dist/* $DL_ROOT/

RUN rm -Rf /tmp/build

COPY common /common
COPY server /server
RUN npm --prefix /common i --omit=dev && \
    npm --prefix /server i --omit=dev

ENTRYPOINT pm2-runtime start /server/src/cloudtitan.js