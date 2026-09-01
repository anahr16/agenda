// Diseños hechos a mano por Ana (Procreate), compartidos entre login,
// sidebar y Agenda -- ver readme.md ("Diseño: stickers hechos a mano por
// Ana") para el detalle de cómo se procesaron.
//
// Dos pools con roles distintos: LETTERING son palabras/frases (pensadas
// para leerse, no para reconocerse como forma a simple vista -- por eso
// solo se usan donde el texto va a estar grande y protagonista, como el
// cuadro "Una afirmación" de Agenda). FLORES son formas (se reconocen bien
// como sticker decorativo en cualquier tamaño chico) -- login y sidebar
// usan FLORES, no LETTERING, por eso mismo.
export const LETTERING = ['hello', 'aloha', 'beautiful', 'poderosa', 'autentica', 'eres-genial'] as const;
export const FLORES = ['margarita', 'hibisco_morado', 'hibisco_rosa', 'shell2'] as const;

function elegirUno(pool: readonly string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function elegirUnicos(pool: readonly string[], cantidad: number): string[] {
  const copia = [...pool];
  const elegidos: string[] = [];
  for (let i = 0; i < cantidad && copia.length > 0; i++) {
    elegidos.push(copia.splice(Math.floor(Math.random() * copia.length), 1)[0]);
  }
  return elegidos;
}

export function elegirSticker(): string {
  return elegirUno(LETTERING);
}

export function elegirStickersUnicos(cantidad: number): string[] {
  return elegirUnicos(LETTERING, cantidad);
}

export function elegirFlor(): string {
  return elegirUno(FLORES);
}

export function elegirFloresUnicas(cantidad: number): string[] {
  return elegirUnicos(FLORES, cantidad);
}
