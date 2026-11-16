# Cómo funciona Repe

Este documento explica **qué hace la aplicación y cómo debe comportarse**, sin entrar en detalles técnicos. Sirve como referencia para decidir si algo es un error ("no hace lo que dice acá") o un cambio nuevo ("queremos que haga otra cosa"). Cuando cambie una regla, hay que actualizar este documento.

> Para instalar, configurar o programar, ver el [README](../README.md).

---

## Índice

1. [Qué es Repe](#1-qué-es-repe)
2. [Palabras que usamos](#2-palabras-que-usamos)
3. [Pantalla de inicio](#3-pantalla-de-inicio)
4. [Buscador de ejercicios](#4-buscador-de-ejercicios)
5. [Ficha de un ejercicio](#5-ficha-de-un-ejercicio)
6. [Cuenta: entrar con Google](#6-cuenta-entrar-con-google)
7. [Rutinas](#7-rutinas)
8. [Rutina sugerida en el inicio](#8-rutina-sugerida-en-el-inicio)
9. [Empezar semana nueva](#9-empezar-semana-nueva)
10. [Importar una rutina desde una foto](#10-importar-una-rutina-desde-una-foto)
11. [Fotos que no se pudieron leer bien](#11-fotos-que-no-se-pudieron-leer-bien)
12. [Panel de administración](#12-panel-de-administración)
13. [Límites diarios](#13-límites-diarios)
14. [Privacidad: qué datos guardamos](#14-privacidad-qué-datos-guardamos)
15. [Limitaciones conocidas e ideas pendientes](#15-limitaciones-conocidas-e-ideas-pendientes)

---

## 1. Qué es Repe

Repe es una web para **aprender a hacer bien cada ejercicio del gimnasio** y **armar tus rutinas**.

- Buscás un ejercicio (por ejemplo "press arnold") y llegás a su **ficha**: un video corto, qué músculos trabaja, cómo hacerlo paso a paso, recomendaciones y errores comunes.
- Podés guardar ejercicios en **rutinas** (por ejemplo "Día 1", "Piernas"), con series y repeticiones, e ir tildando lo que hacés cada día.
- Con tu cuenta de Google, tus rutinas quedan guardadas y las ves desde cualquier dispositivo. También podés **importar una rutina sacándole una foto** a la que te dio tu profe.

Toda la app está en español rioplatense ("apoyá", "bajá").

## 2. Palabras que usamos

| Palabra | Qué significa |
|---|---|
| **Catálogo** | La lista de todos los ejercicios que conoce Repe (arranca con unos 870). |
| **Ficha** | La página de un ejercicio, con su video y su explicación. |
| **Rutina** | Una lista de ejercicios que armás vos, con series y repeticiones opcionales. |
| **Tildar** | Marcar un ejercicio de la rutina como hecho hoy. |
| **Completar una rutina** | Tildar todos sus ejercicios. |
| **Alternativa** | Otro ejercicio del catálogo que trabaja lo mismo con distinto equipamiento (por ejemplo, polea → mancuernas). |
| **IA** | Inteligencia artificial (Gemini, de Google). La usamos para escribir las fichas, reconocer ejercicios nuevos y leer fotos de rutinas. |
| **Sin cuenta / con cuenta** | Usar la app sin entrar, o habiendo entrado con Google. |

## 3. Pantalla de inicio

Muestra, de arriba hacia abajo:

- **Arriba a la derecha:** el botón **Mis rutinas** y el de la cuenta (**Entrar** con Google, o tu foto si ya entraste; tocándola aparece **Cerrar sesión**).
- **La pregunta "¿Qué ejercicio querés hacer bien hoy?"** con el buscador y algunos ejemplos para probar.
- **La rutina sugerida para hoy**, si tenés rutinas con ejercicios (ver [sección 8](#8-rutina-sugerida-en-el-inicio)).
- **Los más buscados:** una lista fija de ejercicios populares.

## 4. Buscador de ejercicios

- Busca mientras escribís, entre los nombres en español, en inglés y otras formas de llamar al mismo ejercicio ("sillón de cuádriceps" encuentra "Extensión de cuádriceps").
- No le importan las mayúsculas ni los acentos, y **tolera errores de tipeo** en palabras de 4 letras o más.
- Si escribiste exactamente el nombre de un ejercicio, ese aparece primero. Los ejercicios revisados a mano aparecen más arriba.

**Si el ejercicio no existe** (y escribiste al menos 3 letras), aparece el botón **"Crear la ficha de «…»"**:

1. Antes de crear nada, se fija si ya existe con otro nombre. Si existe, te lleva a esa ficha.
2. Si no existe, la IA decide si lo que escribiste es un ejercicio real.
   - Si no lo es (por ejemplo "pizza"), avisa: *"«pizza» no parece un ejercicio. Revisá cómo lo escribiste."*
   - Si lo es, crea la ficha nueva con su nombre correcto en español y te lleva ahí. Lo que escribiste queda guardado como otra forma de buscarlo.
3. Hay un tope de fichas nuevas por día (ver [sección 13](#13-límites-diarios)).

## 5. Ficha de un ejercicio

Cada ficha tiene:

- **Imágenes** del movimiento (normalmente inicio y final).
- **Video:** una demostración corta, **sin sonido y en bucle**.
  - Si un administrador eligió un video a mano, siempre se muestra ese.
  - Si no, Repe busca uno automáticamente en YouTube: prefiere una demo corta (de 8 a 90 segundos). Si no encuentra, la ficha queda sin video y se vuelve a intentar al día siguiente.
- **Qué trabaja:** los músculos principales y secundarios, con su nombre común y técnico, cuánto participa cada uno y para qué sirve fortalecerlo.
- **Cómo hacerlo:** entre 4 y 8 pasos.
- **Recomendaciones** y **errores comunes** (cada error dice por qué es un problema y cómo corregirlo).
- **Aviso de seguridad** breve. La ficha nunca da cargas, series ni consejos médicos.
- **Alternativas:** hasta 3 ejercicios que reemplazan a este con **otro equipamiento** (por ejemplo, si es en polea, uno con mancuernas), para cuando la máquina está ocupada o no la hay. Cada una lleva a su ficha.
  - Las propone la IA y **solo se muestran las que existen en el catálogo** de Repe. Si no hay ninguna, la sección no aparece.
  - Se calculan una vez para todo el catálogo (no cuando el usuario abre la ficha). Los ejercicios nuevos creados desde el buscador no tienen alternativas hasta la próxima vez que se calculen.
- El botón **Agregar a mi rutina** (ver [sección 7](#7-rutinas)).

**Cuándo se escribe la ficha:** la primera vez que alguien abre un ejercicio sin ficha, la IA la escribe en ese momento (tarda unos segundos y se muestra "Preparando la ficha"). Queda guardada y nadie más la vuelve a generar. Si falla, se puede reintentar. Si se alcanzó el tope diario de la IA, la ficha se muestra con los datos básicos y se completa otro día.

Al pie de toda la app: *"Contenido informativo, generado con asistencia de IA. No reemplaza la indicación de un profesional."*

## 6. Cuenta: entrar con Google

- **No hace falta cuenta** para buscar ejercicios, ver fichas ni armar rutinas.
- **Sin cuenta**, las rutinas se guardan **solo en ese navegador**. Si se borran los datos del navegador o cambiás de dispositivo, no las ves.
- **Con cuenta (Google)**, las rutinas se guardan en la cuenta y se ven desde cualquier dispositivo. Además se habilita **importar desde una foto**.
- **Al entrar por primera vez**, las rutinas que tenías en el navegador **se suben a tu cuenta** y se borran del navegador. Si una ya existía en la cuenta, se conserva la de la cuenta.
- La sesión dura **60 días**. **Cerrar sesión** desde el menú de tu foto. Al salir volvés a ver las rutinas del navegador (si había).
- Si el login con Google falla, en "Mis rutinas" aparece: *"No pudimos iniciar sesión con Google. Probá de nuevo."*
- Si el login con Google no está configurado, el botón **Entrar** no aparece y todo funciona sin cuenta.

## 7. Rutinas

### Crear y armar

- En **Mis rutinas** → **Nueva rutina**, le ponés un nombre (máximo 40 caracteres, por ejemplo "Tirón", "Piernas", "Lunes").
- Desde la ficha de cualquier ejercicio → **Agregar a mi rutina**: elegís una o varias rutinas (o creás una nueva ahí mismo) y opcionalmente **series** y **repeticiones** ("4" y "10-12").
  - Si el ejercicio ya está en alguna rutina, el botón dice "En 2 rutinas · Editar" y permite cambiar series/repeticiones o sacarlo.
  - Un mismo ejercicio aparece **una sola vez** por rutina.
- Las series y repeticiones se muestran como "4 × 10-12".

### Usar la rutina

- Al abrir una rutina ves sus ejercicios y vas **tildando** los que hacés.
- **Los tildes son del día:** al día siguiente arrancan de cero solos.
- Cuando tildás **todos** los ejercicios, la rutina queda **completada** (se usa para la [rutina sugerida](#8-rutina-sugerida-en-el-inicio)).
- Con **Editar** podés renombrarla, cambiar el orden de los ejercicios, quitar ejercicios o borrar la rutina (pide confirmación).
- Al salir de la rutina y volver, deja de estar en modo edición.

### Guardado

- Cada cambio se ve **al instante** y, con cuenta, se guarda en segundo plano.
- Si no se puede guardar (por ejemplo, sin conexión), aparece *"Hay cambios que todavía no se guardaron en tu cuenta…"* y se reintenta solo.
- El orden de las rutinas en la lista es **el orden en que se crearon**.
- Topes: hasta **100 rutinas** por cuenta y **60 ejercicios** por rutina.

## 8. Rutina sugerida en el inicio

En el inicio aparece **una** rutina para hoy, elegida así:

1. **Si hay una rutina a medias hoy** (algún ejercicio tildado, pero no todos) → *"Seguir con Día 3 · 2 de 6 ejercicios hechos"*.
2. **Si no**, la **siguiente** en la lista a la **última que completaste** → *"Empezar Día 4 · Te toca hoy · 6 ejercicios"*. Después de la última de la lista, vuelve a la primera.
3. **Si nunca completaste ninguna** → la **primera** de la lista.

Solo se tienen en cuenta las rutinas que tienen ejercicios. Si no hay ninguna, no aparece nada.

**Ejemplo:** tenés Día 1, Día 2 y Día 3. El lunes completás el Día 1 → el martes te sugiere el Día 2. Completás el Día 2 → te sugiere el Día 3. Completás el Día 3 → vuelve al Día 1.

## 9. Empezar semana nueva

En **Mis rutinas**, cuando alguna rutina tiene tildes o figura como completada, aparece el botón **Empezar semana nueva**.

- Pide confirmación.
- **Borra todos los tildes y las "completadas"** de todas las rutinas, así la sugerencia vuelve a arrancar por la primera.
- **No borra rutinas ni ejercicios**, ni cambia series o repeticiones.

## 10. Importar una rutina desde una foto

Disponible **solo con cuenta**, desde **Mis rutinas → Importar desde una foto**. Sirve para pasar a Repe la rutina que te dio tu profe (captura de una app, foto de una planilla, etc.).

### Paso a paso

1. **Elegís una foto o captura.** Antes de subirla, la app la achica para que pese poco.
2. **La IA la lee** (tarda unos segundos) y detecta:
   - **Los días:** cada título como "Día 3", "Lunes" o "Piernas" es un día.
   - Si la captura empieza a mitad de un día (hay ejercicios antes del primer título), esos quedan en un día llamado "(sin título)".
   - **Los ejercicios**, con **series** y **repeticiones** ("4 series 15 a 10" → 4 × 15-10; "4x30" → 4 × 30). Los bloques de abdominales cuentan como ejercicios.
   - Aclaraciones del texto (por ejemplo "si no podés con la barra, sentado en un banco") se muestran como nota.
3. **Repe busca cada ejercicio en el catálogo** y propone el más parecido.
4. **Revisás antes de guardar:**
   - Si hay varios días, elegís **qué día importar**. Por defecto queda elegido el primero con título.
   - El nombre de la rutina es el del día (se puede cambiar).
   - Para cada ejercicio ves cómo estaba escrito en la foto y el ejercicio propuesto. Podés:
     - elegir **otro** de una lista de parecidos,
     - elegir **"Crear ficha nueva"** si no está en Repe (se crea al guardar, como desde el buscador),
     - elegir **"No agregar"**,
     - corregir series y repeticiones.
   - Si la coincidencia es dudosa, se marca **"Revisá que sea el correcto"**.
5. **Crear rutina** → se guarda en tu cuenta y te lleva a ella.

Si la lectura salió mal, en la pantalla de revisión está **"¿La lectura salió mal? Avisanos"** (ver la sección siguiente).

Cada vez que entrás a "Importar" la pantalla arranca de cero; no quedan restos de la importación anterior.

### Reglas y límites

- Formatos: **JPG, PNG o WebP**, hasta **4 MB**. Casi cualquier foto del celular funciona porque se convierte antes de subirla.
- Cada usuario puede leer hasta **10 fotos por día**. Hoy **cuentan también los intentos que fallaron**. Al llegar al tope: *"Llegaste al límite de fotos por hoy. Probá mañana."*
- Si la IA no responde: *"No pudimos leer la imagen. Probá de nuevo."*
- Si no encuentra ejercicios: *"No encontramos ejercicios en la imagen."*

## 11. Fotos que no se pudieron leer bien

Para mejorar la lectura de rutinas con estructuras distintas (de otros gimnasios, apps o planillas), **guardamos la foto junto con lo que entendió la IA** cuando:

| Caso | Cuándo pasa |
|---|---|
| Error de la IA | La IA falló al leer la foto. |
| Sin ejercicios | La IA no encontró ningún ejercicio. |
| Lectura floja | De 3 ejercicios o más, la mitad o más no se encontraron en el catálogo o quedaron dudosos. |
| Avisada por el usuario | El usuario tocó **"¿La lectura salió mal? Avisanos"** (puede dejar un comentario, por ejemplo "mezcló dos días"). |
| Formato no aceptado | El archivo llegó en un formato que no aceptamos. |

Reglas:

- Antes de subir la foto, la pantalla avisa: *"Si no la podemos leer bien, guardamos la imagen en privado por 30 días para mejorar la lectura de rutinas."*
- Cuando se guarda por un error, el mensaje de error lo dice: *"Guardamos la imagen para revisar por qué no la pudimos leer."*
- Las fotos se guardan **en privado** (no tienen un link público) y **se borran solas a los 30 días**.
- Se guardan como máximo **5 por usuario por día**.
- El equipo las revisa para ajustar cómo la IA lee las rutinas.

## 12. Panel de administración

Una página interna (`/admin`) a la que se entra con una clave secreta. Sirve para:

- **Videos:** ver qué ejercicios no tienen video, cuáles tienen uno elegido automáticamente y cuáles uno elegido a mano. Pegar el link de YouTube del video que queremos, quitarlo o pedir uno automático.
- **Imágenes:** subir fotos propias, pegar un link, quitar, reordenar y elegir la principal (la que se ve en el buscador, en "Los más buscados" y en las rutinas).
- Ver qué ejercicios tienen el **nombre revisado** a mano.

## 13. Límites diarios

Para controlar costos y abusos, la app tiene topes por día. **El día se cuenta en hora UTC: los contadores se reinician a las 21:00 de Argentina.**

| Qué | Tope por defecto | Qué ve el usuario al llegar |
|---|---|---|
| Fichas nuevas desde el buscador, por persona | 3 | "Llegaste al límite de fichas nuevas por hoy. Probá mañana." |
| Fichas nuevas desde el buscador, en total | 30 | "Hoy ya se crearon muchas fichas nuevas. Probá mañana." |
| Fotos de rutinas leídas, por usuario | 10 | "Llegaste al límite de fotos por hoy. Probá mañana." |
| Usos de la IA en total (fichas + fotos) | 500 | Fotos: "Hoy la IA está muy pedida. Probá más tarde." Fichas: se muestran con los datos básicos. |
| Búsquedas de video en YouTube | 90 | La ficha queda sin video hasta otro día. |
| Fotos guardadas para revisión, por usuario | 5 | No se guardan más ese día (el usuario no ve nada distinto). |

Estos números se pueden cambiar sin tocar la app (son parte de la configuración). Además, Google pone sus propios límites a la IA; los de Repe deberían quedar por debajo.

## 14. Privacidad: qué datos guardamos

- **Sin cuenta:** nada personal. Las rutinas quedan solo en el navegador.
- **Con cuenta de Google:** tu **nombre, email y foto de perfil** (para mostrarlos en la app), y tus **rutinas** con sus tildes. No pedimos ningún otro permiso de Google.
- **Fotos de rutinas:** la foto se manda a la IA para leerla. **No se guarda**, salvo en los casos de la [sección 11](#11-fotos-que-no-se-pudieron-leer-bien) (en privado, 30 días).
- Para los topes por persona del buscador se guarda una versión **codificada** de la dirección IP, que no permite recuperar la IP original.

## 15. Limitaciones conocidas e ideas pendientes

- **El orden de las rutinas es el de creación** y no se puede cambiar. Si importaste los días desordenados, la sugerencia sigue ese orden. *(Idea: poder reordenar rutinas.)*
- **Destildar un ejercicio** de una rutina que ya completaste hoy no le quita la marca de "completada".
- **Las fotos que fallan por un error de la IA cuentan** para el tope de 10 por día. *(Idea: no descontarlas.)*
- **La rutina sugerida no sabe qué día de la semana es**: sigue el orden de la lista, no un calendario.
- **No hay una pantalla para ver las fotos guardadas** para revisión; hoy se consultan con un comando (ver README).
- **Las alternativas no se pueden elegir desde una rutina.** *(Idea: botón "cambiar por alternativa" en la rutina, para cuando la máquina está ocupada.)*
