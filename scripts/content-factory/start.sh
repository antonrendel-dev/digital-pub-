#!/bin/bash
set -a
source /opt/bots/content-factory/.env
set +a
exec node /home/claude/projects/digital-pub-/scripts/content-factory/content-bot.compiled.js
