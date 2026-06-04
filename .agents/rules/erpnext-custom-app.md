---
trigger: always_on
---

Estamos creando una aplicacion de ERPNext v16, tu trabajo es hacer una aplicacion robusta aplicando los principios de modularidad.

La aplicación debe ser modular y bien estructurada para que otra gente pueda integrar su codigo dentro de la misma app que estamos creando.
Debemos dejar endpoints utiles para que ellos puedan añadir funcionalidades extra.

**IMPORTANTE**
1.1. Si trabajamos con Vue -> Debemos refrescar el servidor siempre que se necesite y bench build --app {nuestra_app} para hacer que los cambios se hagan efectivos
1.2 Si trabajamos con la App de ERPNext (Doctypes, Formularios, Python) -> Debemos mandar el comando: bench migrate && bench clear-cache && bench restart al final de cada una de las modificaciones.
2. Debemos hacer tests logicos y poco redundantes de todas las operaciones logicas para saber que todo funciona con todas las variables