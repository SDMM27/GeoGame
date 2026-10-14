// Legal pages in Spanish (see ../documents.js for the format and when to update them).
export default {
  privacy: {
    title: 'Política de privacidad',
    intro: [
      'GeoGame es un juego de geografía gratuito, en el sitio web {site} y en la app móvil GeoGame. Esta página explica qué datos tratamos, por qué, durante cuánto tiempo y cómo ejercer tus derechos.',
      'Recogemos los menos datos posibles: sin publicidad, sin venta de datos, sin elaboración de perfiles.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Responsable del tratamiento',
        blocks: ['{editor}, con quien puedes contactar en {email}.'],
      },
      {
        id: 'data',
        title: 'Los datos que tratamos',
        blocks: [
          'Sin cuenta, puedes jugar libremente. En ese caso solo recibimos lo que decides publicar: el nombre y la puntuación que guardas en una clasificación, el nombre que usas en una sala multijugador y las denuncias que haces (con un identificador aleatorio creado en tu dispositivo).',
          'Con una cuenta, tratamos además:',
          {
            list: [
              'tu dirección de correo y tu contraseña, que Firebase Authentication guarda cifrada: nunca tenemos acceso a ella. Si inicias sesión con Google, recibimos la dirección de correo y el identificador de tu cuenta de Google (Google también puede enviar tu nombre y tu foto de perfil, que no usamos);',
              'tu nombre de usuario, la fecha de creación de la cuenta y las fechas de inicio de sesión;',
              'el historial de tus partidas (juego, modo, puntuación, tiempo, fecha) y tus puntuaciones en las clasificaciones, incluidas las respuestas probadas en los retos del día;',
              'tus solicitudes de amistad, tus amigos y las invitaciones a salas que envías o recibes;',
              'si permites las notificaciones, en la app o en la web app añadida a tu pantalla de inicio: un identificador de notificaciones del dispositivo (token de Expo o suscripción Web Push), tu idioma, tu tipo de dispositivo y tu elección para el recordatorio diario.',
            ],
          },
          'Para todos, nuestros proveedores de alojamiento tratan también la dirección IP y la información técnica de cada solicitud (navegador, dispositivo) para hacer funcionar y proteger el servicio. En el sitio web, Vercel Web Analytics mide la audiencia sin cookies y solo ofrece estadísticas agregadas de visitas, y Firebase App Check usa Google reCAPTCHA Enterprise, que analiza señales del navegador para comprobar que las solicitudes vienen realmente del juego.',
        ],
      },
      {
        id: 'public',
        title: 'Qué es público',
        blocks: [
          'Tu nombre de usuario, tus puntuaciones en las clasificaciones y tu página de perfil (fecha de registro, estadísticas, historial de partidas) son visibles para todos. Tu dirección de correo, tus amigos y tus invitaciones nunca son públicos. Si prefieres seguir en el anonimato, elige un nombre de usuario que no revele quién eres.',
        ],
      },
      {
        id: 'purposes',
        title: 'Por qué y con qué base jurídica',
        blocks: [
          {
            list: [
              'Hacer funcionar el juego, tu cuenta, las clasificaciones, tu historial, los amigos y el multijugador: ejecución de las [condiciones de uso](/terms) que aceptas al usar GeoGame (artículo 6.1.b del RGPD).',
              'Enviar notificaciones (invitaciones a salas, solicitudes de amistad, recordatorio del reto del día): tu consentimiento, dado al permitir las notificaciones y que puedes retirar en cualquier momento en los ajustes de tu dispositivo. El recordatorio diario también se puede desactivar desde tu perfil.',
              'Proteger el servicio contra trampas y abusos (App Check, denuncias, filtro de nombres) y medir la audiencia de forma anónima: nuestro interés legítimo en ofrecer un juego fiable y mejorarlo (artículo 6.1.f del RGPD).',
            ],
          },
          'No hacemos publicidad, ni elaboración de perfiles, ni decisiones automatizadas sobre ti, y no vendemos ningún dato.',
        ],
      },
      {
        id: 'recipients',
        title: 'Destinatarios y proveedores',
        blocks: [
          'Tus datos solo son accesibles para el editor y para los siguientes proveedores técnicos, que los tratan por nuestra cuenta:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): cuentas, base de datos y protección contra abusos;',
              'Vercel Inc.: alojamiento del sitio web y de las funciones de servidor, medición de audiencia;',
              'Expo (650 Industries, Inc.): envío de notificaciones y actualizaciones de la app;',
              'servicios push de los navegadores (Apple, Google, Mozilla o Microsoft según tu dispositivo): envío de las notificaciones de la web app;',
              'Flagpedia (flagcdn.com): algunas imágenes de banderas del sitio web.',
            ],
          },
          'Algunos de estos proveedores están fuera de la Unión Europea, en particular en Estados Unidos. Estas transferencias están cubiertas por el Marco de Privacidad de Datos UE-EE. UU. o por las cláusulas contractuales tipo de la Comisión Europea.',
        ],
      },
      {
        id: 'retention',
        title: 'Cuánto tiempo conservamos los datos',
        blocks: [
          {
            list: [
              'Cuenta y datos asociados: mientras exista la cuenta. Una cuenta sin usar durante 3 años (sin inicio de sesión ni partidas) se elimina automáticamente con todos sus datos.',
              'Puntuaciones guardadas sin cuenta: mientras exista la clasificación. Puedes pedir que se eliminen.',
              'Salas multijugador: se eliminan automáticamente al caducar, como máximo 10 días después de crearse. Invitaciones: un día como máximo.',
              'Tokens de notificación: hasta que el dispositivo cierre sesión, se elimine la cuenta o el dispositivo ya no pueda recibirlas.',
              'Denuncias: el tiempo necesario para tramitarlas.',
              'Registros técnicos de los proveedores de alojamiento: un periodo limitado fijado por el proveedor, normalmente unos días.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies y almacenamiento en tu dispositivo',
        blocks: [
          'GeoGame no usa cookies publicitarias ni de medición de audiencia. El juego guarda en tu dispositivo lo que necesita para funcionar: tu sesión, tu nombre, tu idioma, las salas recientes, tu progreso en los retos del día y un identificador aleatorio de visitante para las denuncias. reCAPTCHA puede instalar una cookie técnica necesaria para la protección contra abusos.',
          'Estos elementos son estrictamente necesarios para el servicio y, por tanto, no requieren consentimiento. Puedes borrarlos en cualquier momento en los ajustes de tu navegador o desinstalando la app.',
        ],
      },
      {
        id: 'rights',
        title: 'Tus derechos',
        blocks: [
          'Tienes derecho a acceder a tus datos, rectificarlos y suprimirlos, a limitar su tratamiento u oponerte a él, y a la portabilidad de los datos.',
          'Puedes eliminar tú mismo tu cuenta y todos sus datos en cualquier momento: consulta [Eliminar mi cuenta](/delete-account). Para cualquier otra solicitud (una copia de tus datos, un cambio de nombre de usuario, eliminar una puntuación guardada sin cuenta…), escribe a {email}. Respondemos en el plazo de un mes.',
          'Si consideras que no se respetan tus derechos, puedes presentar una reclamación ante tu autoridad de protección de datos, en Francia la CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Menores',
        blocks: [
          'Cualquiera puede jugar a GeoGame sin cuenta. La creación de una cuenta está reservada a personas de 13 años o más y, entre 13 y 15 años, a quienes tengan el permiso de uno de sus padres. Un padre o una madre que descubra que su hijo ha creado una cuenta sin su permiso puede escribirnos para que la eliminemos.',
        ],
      },
      {
        id: 'security',
        title: 'Seguridad',
        blocks: [
          'Todos los intercambios están cifrados (HTTPS). El acceso a la base de datos está controlado por reglas de seguridad: cada persona solo puede leer lo que es público o lo que le concierne, y solo puede modificar sus propios datos.',
        ],
      },
      {
        id: 'changes',
        title: 'Cambios',
        blocks: [
          'Podemos actualizar esta política; la fecha en la parte superior de la página indica la última versión. Si cambia algo importante, lo anunciaremos en el juego.',
        ],
      },
    ],
  },

  terms: {
    title: 'Condiciones de uso',
    intro: [
      'Estas condiciones regulan el uso de GeoGame, en el sitio web {site} y en la app móvil. Al usar GeoGame, las aceptas.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Acceso al juego',
        blocks: [
          'GeoGame es gratuito y se puede jugar sin cuenta. Una cuenta permite además reservar un nombre de usuario, conservar un historial, añadir amigos y recibir invitaciones. El acceso a Internet corre por tu cuenta.',
          'El juego se ofrece tal cual. Podemos modificarlo, añadir o quitar juegos o interrumpirlo, en particular por mantenimiento, sin previo aviso.',
        ],
      },
      {
        id: 'account',
        title: 'Cuenta',
        blocks: [
          'La creación de una cuenta está reservada a personas de 13 años o más y, entre 13 y 15 años, a quienes tengan el permiso de uno de sus padres. Te comprometes a dar una dirección de correo válida y a mantener tu contraseña en secreto. Puedes eliminar tu cuenta en cualquier momento ([Eliminar mi cuenta](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Normas de conducta',
        blocks: [
          'Al usar GeoGame, te comprometes a no:',
          {
            list: [
              'elegir un nombre de usuario insultante, de odio, discriminatorio o sexual, que suplante a otra persona o que revele información personal de otra persona;',
              'hacer trampas: modificar o falsificar puntuaciones, automatizar partidas, aprovechar un error;',
              'perturbar el servicio o intentar acceder a datos que no te conciernen;',
              'acosar a otros jugadores, por ejemplo con invitaciones o solicitudes de amistad repetidas.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderación',
        blocks: [
          'Cualquiera puede denunciar una puntuación o un nombre de usuario con la bandera que aparece en las clasificaciones. Podemos eliminar una puntuación, un nombre de usuario o una cuenta que incumpla estas normas, sin previo aviso en los casos evidentes.',
        ],
      },
      {
        id: 'ip',
        title: 'Propiedad intelectual',
        blocks: [
          'El nombre, el código, el diseño y los textos de GeoGame pertenecen al editor. Está prohibido reproducirlos sin autorización. Los créditos de los contenidos de terceros (mapas, tipografías) figuran en el [aviso legal](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Responsabilidad',
        blocks: [
          'La información geográfica del juego (fronteras, nombres, capitales, cifras) se ofrece para jugar y puede contener errores o simplificaciones. No expresa ninguna posición política.',
          'En la medida en que lo permita la ley, el editor no se hace responsable de las interrupciones del servicio ni de la pérdida de puntuaciones o datos de juego.',
        ],
      },
      {
        id: 'privacy',
        title: 'Datos personales',
        blocks: ['El tratamiento de tus datos se describe en la [política de privacidad](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Cambios y ley aplicable',
        blocks: [
          'Podemos modificar estas condiciones; la fecha en la parte superior de la página indica la última versión. Seguir usando GeoGame después de un cambio implica que lo aceptas.',
          'Estas condiciones se rigen por la ley francesa. En caso de desacuerdo, escríbenos primero a {email} para buscar una solución amistosa.',
        ],
      },
    ],
  },

  legal: {
    title: 'Aviso legal',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Editor',
        blocks: ['GeoGame está editado por {editor}.', 'Contacto: {email}', 'Director de la publicación: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Alojamiento',
        blocks: [
          {
            list: [
              'Sitio web y funciones de servidor: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Estados Unidos ([vercel.com](https://vercel.com)).',
              'Cuentas y base de datos: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublín 4, Irlanda ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Créditos',
        blocks: [
          {
            list: [
              'Banderas: [Flagpedia](https://flagpedia.net).',
              'Tipografía Inter: Rasmus Andersson, bajo licencia SIL Open Font License.',
              'Contornos detallados de los territorios pequeños: [geoBoundaries](https://www.geoboundaries.org) (CC BY) y © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Denunciar un contenido',
        blocks: [
          'Para denunciar un contenido ilícito, como un nombre de usuario ofensivo, usa la bandera de denuncia de las clasificaciones o escribe a {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Ver también',
        blocks: ['[Política de privacidad](/privacy) · [Condiciones de uso](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Eliminar tu cuenta',
    intro: ['Puedes eliminar tu cuenta de GeoGame en cualquier momento y de forma gratuita. La eliminación es inmediata y definitiva.'],
    sections: [
      {
        id: 'app',
        title: 'Desde la app',
        blocks: ['Abre la pestaña Perfil, toca «Eliminar mi cuenta» en la parte inferior de la pantalla y confirma con tu contraseña o con Google.'],
      },
      {
        id: 'site',
        title: 'Desde el sitio web',
        blocks: ['Inicia sesión en la página [Mi cuenta](/account), haz clic en «Eliminar mi cuenta» y confirma.'],
      },
      {
        id: 'email',
        title: 'Si ya no puedes iniciar sesión',
        blocks: [
          'Escribe a {email} desde la dirección de correo de tu cuenta, indicando tu nombre de usuario. Eliminamos la cuenta en un plazo máximo de 30 días y te lo confirmamos.',
        ],
      },
      {
        id: 'deleted',
        title: 'Qué se elimina',
        blocks: [
          {
            list: [
              'tu cuenta y tu dirección de correo;',
              'tu nombre de usuario, que vuelve a quedar disponible;',
              'tu historial de partidas y tus estadísticas;',
              'tus puntuaciones en todas las clasificaciones;',
              'tus amigos y tus invitaciones;',
              'los dispositivos registrados para las notificaciones;',
              'las denuncias que hiciste y las que afectan a tus puntuaciones.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Qué puede quedar',
        blocks: [
          {
            list: [
              'tu nombre en una sala multijugador, hasta que la sala caduque (10 días como máximo);',
              'las puntuaciones guardadas sin sesión iniciada, que no están vinculadas a tu cuenta: pide su eliminación por correo;',
              'los registros técnicos de los proveedores de alojamiento, que se borran al cabo de unos días.',
            ],
          },
        ],
      },
    ],
  },
}
