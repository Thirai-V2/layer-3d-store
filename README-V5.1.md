# LAYER V5.1 — Boot Sequence Restoration

This patch restores the initial machine startup experience while keeping the V5 redesign.

Restored:
- 24°C → 220°C hotend temperature animation
- bed warm-up to 60°C
- HOMING X AXIS
- HOMING Y AXIS
- CALIBRATING Z
- SYSTEM READY
- actual toolhead visibly moves during homing
- menu/header remains visible above the startup animation
- after startup, the existing scroll-driven MAKE / IDEAS / PHYSICAL printer animation continues

Upload/replace:
- index.html
- styles.css
- script.js

No changes are needed to:
- auth.js
- supabase-config.js
- supabase/schema.sql
