# ELIA by Prime Health (demo)

Static single-page demo. Deployed on Render as a Static Site (see `render.yaml`): no build step, publish directory `.`.

Served over https, so the live camera face scan, voice notes and voice mode work after the browser asks for camera and microphone access.
Features that call Claude (photo recognition, health-record Q&A, Claude's meal nutrient estimate) only run inside Claude's artifact viewer; here they fall back to typing and Prime's built-in food list.
