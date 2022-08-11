#!/bin/bash

LINE_COUNT=$(wc -l "$1" | cut -f 1 -d ' ')
((LINE_COUNT+=7))

INSERT=$(sed -n '/# PAYLOAD/=' "$1")
head -n $INSERT "$1" | head -n -1 > "$3"
echo "# Extract the payload" >> "$3"
echo "PAYLOAD=mktmp" >> "$3"
echo 'if [ "$BASH_SOURCE" == "" ]; then' >> "$3"
echo '  tail -n +2 /proc/self/fd/0 > "$PAYLOAD"' >> "$3"
echo "else" >> "$3"
echo '  tail -n +'$LINE_COUNT' "$BASH_SOURCE" | tail -n +2 > "$PAYLOAD"' >> "$3"
echo "fi" >> "$3"
tail -n +$INSERT "$1" | tail -n +2 >> "$3"
echo "" >> "$3"
cat "$2" >> "$3"

exit 0