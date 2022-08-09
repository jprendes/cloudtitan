#!/bin/bash
pm2-runtime start /server/src/cloudtitan.js -- "$@"