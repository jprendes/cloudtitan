#!/bin/bash

if [ ! -f /etc/udev/rules.d/90-lowrisc.rules ]; then
    cp -f assets/90-lowrisc.rules /etc/udev/rules.d/
    chmod 0644 /etc/udev/rules.d/90-lowrisc.rules
    sudo udevadm control --reload
fi

if [ ! -f /usr/bin/cloudtitan-reloadusb ]; then
    cp -f assets/cloudtitan-reloadusb /usr/bin/
    chmod 0755 /usr/bin/cloudtitan-reloadusb
fi

if [ ! -f /etc/sudoers.d/cloudtitan ]; then
    cp -f assets/cloudtitan /etc/sudoers.d/
    chmod 0644 /etc/sudoers.d/cloudtitan
fi
