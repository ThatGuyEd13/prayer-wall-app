#!/bin/bash
cd "$(dirname "$0")"
export PATH="$PWD/../.tools/node/bin:$PATH"
export CI=1
exec npx expo start --web --port 8081
