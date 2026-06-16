import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_MANANA = `Sos un acompañante somático. Respondé con exactamente 1 línea, máximo 12 palabras. Reflejá el estado corporal implícito en lo que escribió el usuario, sin interpretarlo ni analizarlo. No uses: entiendo, parece, deberías, es normal, ni lenguaje de autoayuda. No hagas preguntas. Hablá desde el cuerpo, no desde la mente.`;

const SYSTEM_SOMATICO = `Sos un acompañante somático reflexivo. Respondés en español rioplatense informal.
Sin consejos ni "deberías". Sin lenguaje de autoayuda ni clichés terapéuticos.
Máximo 2 oraciones cortas. Solo observás, nombrás lo que escuchás, abrís espacio. Pura presencia.`;

const SYSTEM_ESTADO = `Sos un acompañante somático. Respondés en español rioplatense informal.
Una sola oración breve y somática. Nombrás el estado del sistema nervioso detectado con palabras del cuerpo.
Sin "deberías", sin motivación, sin análisis. Solo reconocimiento.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipo, contenido, estado } = req.body ?? {};

  try {
    if (tipo === 'estado') {
      const estadoNombre = {
        simpatico: 'activado (lucha/huida)',
        dorsal: 'desconectado (colapso)',
        ventral: 'en equilibrio (regulado)',
      }[estado] ?? estado;

      const prompt = `El sistema nervioso está en estado ${estadoNombre}.${
        contenido ? ` La persona escribió esta mañana: "${contenido}".` : ''
      } Respondé con una sola oración somática, sin consejo.`;

      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 80,
        system: SYSTEM_ESTADO,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.json({ respuesta: msg.content[0].text });
    }

    if (tipo === 'manana') {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 60,
        system: SYSTEM_MANANA,
        messages: [{ role: 'user', content: contenido }],
      });
      return res.json({ respuesta: msg.content[0].text });
    }

    if (tipo === 'noche') {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 120,
        system: SYSTEM_SOMATICO,
        messages: [{ role: 'user', content: `La persona escribe al cerrar el día: "${contenido}". Respondé con presencia.` }],
      });
      return res.json({ respuesta: msg.content[0].text });
    }

    if (tipo === 'cita') {
      const estadoNombre = {
        simpatico: 'activado (lucha/huida)',
        dorsal: 'desconectado (colapso)',
        ventral: 'en equilibrio (regulado)',
      }[estado] ?? estado;
      const prompt = `Generá una frase de cierre de 1 línea, máximo 15 palabras, que integre la experiencia somática que acaba de completar el usuario. Estado del sistema nervioso: ${estadoNombre}. Lo que trajo hoy: ${contenido ? `"${contenido}"` : 'no especificado'}. Tono: contemplativo, corporal, sin autoayuda, sin clichés. Sin comillas. Sin explicación. Solo la frase.`;
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 60,
        system: 'Generás frases de cierre somáticas en español rioplatense. 1 línea, máximo 15 palabras. Sin comillas. Sin preguntas. Sin consejos. Solo la frase.',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.json({ respuesta: msg.content[0].text });
    }

    return res.status(400).json({ error: 'Tipo no válido' });
  } catch (err) {
    console.error('Error IA:', err);
    return res.status(500).json({ error: 'Error generando respuesta' });
  }
}
