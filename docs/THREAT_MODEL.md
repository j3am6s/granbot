# Threat model

Granbot stores a grandparent’s name, age, city, shelter, emergency-kit place, and family phone numbers. This note is for the prototype.

## Who we defend against

- A visitor at the home iPad
- A lost or stolen iPad
- A stolen family password
- Hostile text inside a weather headline
- A grandparent session trying to read family analytics
- A family session trying to rewrite earthquake or exercise scripts

## Boundaries

- The iPad and the family phone use different cookies. The iPad session cannot call `/api/family/*`. The family session cannot call the unlocked kiosk APIs.
- Family passwords and the iPad PIN are hashed with Argon2id. The PIN locks for 10 minutes after five failures.
- Pairing codes are 8 digits, hashed, single-use, and expire in 30 minutes. Unlinking an iPad bumps a generation counter so old device cookies stop working.
- Session cookies are httpOnly and SameSite=Lax. They are Secure in production.
- Changing requests must come from the same origin.
- Login and pairing are rate limited in process memory. A restart clears those limits.
- The shelter address and emergency-kit location are encrypted with AES-256-GCM before they are stored. The key is `DATA_KEY`.
- Alerts, exercise progress, and meal checks older than 30 days are deleted. The household profile is kept.
- Earthquake, rain, and exercise lines are fixed in code.
- No card data or AirTag credentials are stored.
- Content-Security-Policy allows no third-party script hosts. Music previews are audio files from `https://p.scdn.co` only. Next.js still needs inline bootstrap scripts, so `script-src` includes `'unsafe-inline'`. Development also allows `'unsafe-eval'`.
- The page cannot be framed. The microphone is limited to this origin. Geolocation is off.

## Out of scope for this prototype

- A public AirTag feed. Apple does not offer one for continuous third-party tracking.
- Hardware-backed PIN storage and push notification credentials.
- A medical-device quality system. This is not a diagnosis or an emergency-warning system.
