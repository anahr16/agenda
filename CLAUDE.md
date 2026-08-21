# Pautas de comportamiento

Pautas de comportamiento para reducir errores comunes de codificación en LLMs. Fusionar con instrucciones específicas del proyecto según sea necesario.

**Compensación (tradeoff):** Estas pautas se inclinan hacia la cautela por sobre la velocidad. Para tareas triviales, usa tu criterio.

## 1. Pensar Antes de Codificar

**No asumas. No ocultes la confusión. Expón las compensaciones.**

Antes de implementar:
- Declara tus suposiciones explícitamente. Si tienes dudas, pregunta.
- Si existen múltiples interpretaciones, preséntalas — no elijas en silencio.
- Si existe un enfoque más simple, dilo. Cuestiona cuando esté justificado.
- Si algo no está claro, detente. Identifica qué es lo confuso. Pregunta.

## 2. Simplicidad Primero

**El mínimo código que resuelva el problema. Nada especulativo.**

- Sin funcionalidades más allá de lo que se pidió.
- Sin abstracciones para código de un solo uso.
- Sin "flexibilidad" ni "configurabilidad" que no se haya solicitado.
- Sin manejo de errores para escenarios imposibles.
- Si escribes 200 líneas y podrían ser 50, reescríbelo.

Pregúntate: "¿Un ingeniero senior diría que esto está sobrecomplicado?" Si la respuesta es sí, simplifica.

## 3. Cambios Quirúrgicos

**Toca solo lo que debas. Limpia solo tu propio desorden.**

Al editar código existente:
- No "mejores" código, comentarios ni formato adyacente.
- No refactorices cosas que no están rotas.
- Respeta el estilo existente, incluso si tú lo harías distinto.
- Si detectas código muerto no relacionado, menciónalo — no lo borres.

Cuando tus cambios generen huérfanos:
- Elimina imports/variables/funciones que TUS cambios dejaron sin uso.
- No elimines código muerto preexistente a menos que se te pida.

La prueba: Cada línea modificada debería rastrearse directamente a la solicitud del usuario.

## 4. Ejecución Orientada a Objetivos

**Define criterios de éxito. Itera hasta verificar.**

Transforma las tareas en objetivos verificables:
- "Agregar validación" → "Escribir tests para entradas inválidas, luego hacer que pasen"
- "Arreglar el bug" → "Escribir un test que lo reproduzca, luego hacer que pase"
- "Refactorizar X" → "Asegurar que los tests pasen antes y después"

Para tareas de múltiples pasos, plantea un plan breve:
```
1. [Paso] → verificar: [chequeo]
2. [Paso] → verificar: [chequeo]
3. [Paso] → verificar: [chequeo]
```

Criterios de éxito fuertes te permiten iterar de forma independiente. Criterios débiles ("haz que funcione") requieren aclaraciones constantes.

## 5. Documentación

**Toda la documentación del proyecto vive en un único lugar: `readme.md`.**

- Toda la documentación del proyecto debe registrarse única y exclusivamente en `readme.md`. No crees archivos de documentación paralelos (CHANGELOG, docs/, notas sueltas, etc.).
- Siempre que hagas un cambio o mejora, regístralo en `readme.md` como parte de la misma tarea.

---

**Estas pautas están funcionando si:** hay menos cambios innecesarios en los diffs, menos reescrituras por sobrecomplicación, y las preguntas aclaratorias llegan antes de implementar en lugar de después de cometer errores.
