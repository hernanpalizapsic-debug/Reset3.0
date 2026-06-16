export const AUDIOS = [
  {
    id: 'maestro',
    titulo: 'Ejercicio Maestro',
    descripcion: 'Audio de anclaje. Escuchalo cuando tu sistema lo necesite.',
    src: '/audios/ejercicio-maestro.mp3',
    semanaMinima: 0,
    especial: true,
  },
  {
    id: 'audio-1',
    titulo: 'Audio 1',
    descripcion: 'Fase 1: Estabilización',
    src: '/audios/audio-1.mp3',
    semanaMinima: 1,
  },
  {
    id: 'audio-2',
    titulo: 'Audio 2',
    descripcion: 'Fase 2: Caída del control',
    src: '/audios/audio-2.mp3',
    semanaMinima: 2,
  },
  {
    id: 'audio-3',
    titulo: 'Audio 3',
    descripcion: 'Fase 3: Orden interno',
    src: '/audios/audio-3.mp3',
    semanaMinima: 3,
  },
  {
    id: 'audio-nocturno',
    titulo: 'Audio Nocturno',
    descripcion: 'Para el cierre del día. Reflexión nocturna.',
    src: '/audios/audio-nocturno.mp3',
    semanaMinima: 3,
    nocturno: true,
  },
  {
    id: 'audio-4',
    titulo: 'Audio 4',
    descripcion: 'Fase 4: Autonomía',
    src: '/audios/audio-4.mp3',
    semanaMinima: 4,
  },
];

/** Devuelve el audio del programa correspondiente a la semana (sin contar maestro ni nocturno) */
export function getAudioSemanal(semana) {
  return AUDIOS.find((a) => !a.especial && !a.nocturno && a.semanaMinima === semana) ?? null;
}
