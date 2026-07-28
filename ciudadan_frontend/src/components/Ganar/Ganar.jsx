import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/GanarConCiudadan.css';

// Importa las imágenes
import publicidad from '../../assets/publicidad.png';
import renta from '../../assets/renta.png';
import academicas from '../../assets/academicas.png';
import becas from '../../assets/becas.png';
import contenidos from '../../assets/contenidos.png';
import generales from '../../assets/generales.png';
import reciclando from '../../assets/reciclando.png';
import refiriendo from '../../assets/refiriendo.png';
import mxn from '../../assets/mxn.png';
import labory from '../../assets/labory.png';
import ensenando from '../../assets/ensenando.png';
import taxis from '../../assets/taxis.png';
import invirtiendo from '../../assets/invirtiendo.png';
import agencia from '../../assets/agencia.png';
import ciudadaneando from '../../assets/ciudadaneando.png';

const Ganar = () => {
  const navigate = useNavigate();

  const opciones = [
    { 
      titulo: '🎯 Anuncios/Encuestas:', 
      descripcion: 'Visualiza anuncios y participa en encuestas para ganar Laborys. Ayuda a empresas a mejorar productos y servicios.',
      descripcionCompleta: 'Gana  hasta 50 Laborys por cuestionario respondido, cada uno está diseñado para tomarte menos de 4 minutos. <br />  <br />El 100% de los Laborys cobrados a los anunciantes son dispersados íntegros al auditorio de los anuncios, además los anunciantes adquieren Laborys directamente de la empresa y reinvertimos el 33% en pools de liquidez donde los recompramos, haciendo que Labory sea intercambiable por pesos MXN en el mercado. <br />', 
      boton: '🎯 Ver Anuncios... ',
      imagen: publicidad,
      monedas: [mxn],
      claseimagen: 'opcion-imagen',
      url: '/ver-anuncios'
    },
    { 
      titulo: '💰 RENTA UNIVERSAL', 
      boton: '💰 Afiliarme a Renta Universal... ',
      descripcion: 'Dedica <b> 1 hora diaria </b> a ver anuncios y responder encuestas para ganar Laborys.',
      descripcionCompleta: 'Tu participación apoya la generación de riqueza económica y la mejora de la comunidad. <br /> <br /> Gozamos de múltiples fuentes y modelos de financiamiento, sin embargo uno de nuestros pilares es la publicidad no invasiva, vista a demanda y remunerada, desplazando el total de los Laborys a los usuarios. Contamos con nuestra propia visión y versión de una renta crypto universal, la nuestra es a cambio de ver anuncios e interactuar con ellos. <br /> <br /> Aprovecha solo por lanzamiento: Recibe una renta mensual de 6,000 Laborys. ', 
      imagen: renta,
      monedas: [labory],
      claseimagen: 'opcion-imagen-ensanchada',
      url: '/renta-universal'
    },
    { 
      titulo: '▶ Tareas Académicas:', 
      descripcion: 'Participa en el conocimiento colectivo del cooperativismo 6.0. Contribuye con tus habilidades y conocimientos en desafíos académicos para fortalecer el know-how de la comunidad.',
      descripcionCompleta: 'Gana Laborys por tu participación y aportes. Además gana por cada habilidad en la que te certifiques en alguno de nuestros tests. <br /> <br /> Entre más participas mayor es tu recompensa por cada tarea. <br />', 
      boton: '▶ Ver Desafíos... ',
      imagen: academicas,
      monedas: [mxn, labory],
      claseimagen: 'opcion-imagen',
      url: '/academia'
    },
    { 
      titulo: '🏫 Becas:', 
      descripcion: 'Estudia y trabaja a la vez, la carrera de "Maker Dev en Cooperativismo 6.0 Potenciado por Inteligencia Artificial", con proyectos reales, si no tienes para pagar, financias con unas pocas horas extras de trabajo.',
      descripcionCompleta: 'Trabajo por el cual además obtienes diversas comisiones, financiando tus estudios y teniendo trabajos remunerados desde tu primer períodoGana Laborys por tu participación y aportes. <br />  También gana por cada habilidad en la que te certifiques en alguno de nuestros tests. <br /> <br /> Entre más participas mayor es tu recompensa por cada tarea. <br /> <br /> Parte del trabajo es remoto, parte en campo y solo asistes a alguna de las aulas una vez a la semana. <br /> <br /> Además obtienes un generoso subsidio en Laborys y diversas fuentes de monetización/participación adicionales. ', 
      boton: '🏫 Incríbete Ya !!',
      imagen: becas,
      monedas: [labory],
      claseimagen: 'opcion-imagen-ensanchada',
      url: '/academia'
    },
    { 
      titulo: '📷 Creación de Contenido:', 
      descripcion: 'Crea y comparte contenido valioso con la comunidad. Gana Laborys por tus contribuciones creativas y fortalece tu presencia en la red.',
      descripcionCompleta: 'Además gana por cada habilidad en la que te certifiques en alguno de nuestros tests. <br /> <br /> Entre más participas mayor es tu recompensa por cada tarea. <br /> <br /> Parte del trabajo es remoto, parte en campo y solo asistes a alguna de las aulas una vez a la semana. <br /> <br /> También obtienes un generoso subsidio en Laborys y diversas fuentes de monetización/participación adicionales. <br /> <br /> Si ya eres youtuber contamos con una herramienta gratuita para ti, que gracias a nuestra eficaz aplicación de la inteligencia artificial te permitirá automatizar muchísimas de tus tareas ahorrando toneladas de tiempo como: <br /> <br /> - [ Próximamente.... ] <br /> <br />Doblaje automático de tus videos a múltiples idiomas. <br /> <br /> - Respuesta Automática a mensajes en videos viejos en base al contexto de tu canal, comentarios, perfil, etc. <br /> <br /> - Chat contextual con I.A. que te sugiere temas, palabras clave, realiza análisis, presenta gráficos y mucho más, estamos trabajando en ella. <br /> <br /> - Todo esto a cambio de un breve anuncio en tus videos, por el cual además te remuneramos con cientos y hasta miles de Laborys por cada video. <br /> <br /> Si aún no eres creador, con nuestras herramientas podrás generar contenidos valiosos en minutos, complementando habilidades e inteligencias humanas y artificiales. <br /> <br />Además, si eres creador, podrás generar contenidos valiosos en minutos, complementando habilidades e inteligencias humanas y artificiales. <br /> <br />Tambiém puedes ganar Laborys por otros formatos de contenidos, imágenes, textos, eventos, etc. <br />', 
      boton: ' 📷 Empezar a crear !!',
      imagen: contenidos,
      monedas: [mxn],
      claseimagen: 'opcion-imagen-ensanchada',
      url: '/coowork/especializadas/contenidos'
    },
    { 
      titulo: '❓ Tareas Generales:', 
      descripcion:'Participa en misiones exclusivas y divertidas. Completa tareas variadas y gana Laborys en recompensas atractivas. ',
      descripcionCompleta: 'Las tareas generales van desde aportación de información útil, responder preguntas generales, introducir localizaciones en mapas, compartir publicaciones en redes sociales, investigaciones sencillas en Internet, opiniones, cuestionarios, probar productos y mucho más. <br /> <br /> Gana decenas y cientos de Laborys por cada tarea de acuerdo a la calidad y otros factores de la misma. <br /> <br /> Además con tu colaboración no solo la moneda se vuelve más valiosa y aceptada, si no que cada vez tendrás más así como mejores herramientas y servicios en esta plataforma. <br />', 
      boton: '❓ Descubrir misiones !!',
      imagen: generales,
      monedas: [mxn, labory],
      claseimagen: 'opcion-imagen',
      url: '/coowork/generales'
    },
    { 
      titulo: '♻ Reciclando:', 
      descripcion: 'Contribuye al medio ambiente y gana Laborys. Consulta la lista de Objetos Aceptados, llévalos a alguno de nuestros puntos de colecta y obtén tu recompensa.',
      descripcionCompleta: 'En etapas próximas se fortalecerán los sistemas de recolección para remunerarte a domicilio por clasificar adecuadamente tus desechos. <br /> <br /> Gana también participando en campañas de reforestación y reverdecimiento urbano, rescate avícola, cuidado animal, ambiental y más. <br /> <br /> Participa en iniciativas de reciclaje y sostenibilidad para hacer una diferencia. <br /> <br /> Da valor a Labory con la semilla de tus acciones ambientales. <br />',
      boton: '♻  Colabora y Gana !!',
      imagen: reciclando,
      monedas: [labory],
      claseimagen: 'opcion-imagen',
      url: '/reciclando'
    },
    { 
      titulo: '📢 Refiriendo:', 
      descripcion: 'Comparte Ciudadan con tus amigos y gana Laborys por cada referido. Construye tu red y aumenta tus ingresos al atraer a más personas a la plataforma. <br /> <br />',
      descripcionCompleta: 'Gana por diversas actividades que realicen tus referidos en la red Ciudadan, cuando adquieren una membresía, cuando refieres a un cliente publicitario, a un inversionista en nuestros tokens, un youtuber, académico y múcho más. <br /> <br /> Te brindamos diversos materiales promocionales personalizables para facilitar tu labor. <br /> <br />  Además de que te pagamos comisiones justas en efectivo, también te remuneramos adicionalmente con cientos, miles y hasta millones de Laborys cuando refieres a inversionistas grandes a nuestos Ciudadan Investment Tokens.', 
      boton: '📢 Comenzar a Ganar !!',
      imagen: refiriendo,
      monedas: [mxn],
      claseimagen: 'opcion-imagen',
      url: '/referidos'
    },
    { 
      titulo: '👨‍🏫 Enseñando:', 
      descripcion: 'Si eres experto en algún tema e impartes cursos sobre éste, ya sea en línea o presencialmente.',
      descripcionCompleta: 'Ganas el 100% del pago en efectivo de los usuarios, a cambio de aceptar que paguen hasta el 13% en Laborys y hasta el 50% los usuarios que tienen membresía, además de que formas parte de la red docente y ganas rendimientos de la plataforma en efectivo así como importantes subsidios y beneficios en Laborys. <br /> Te ofrecemos las mejores herramientas tanto digitales como pedagógicas, potenciadas por Inteligencia Artificial para que seas un maestro de la nueva era en el cooperativismo 6.0. <br /><br /> La actividad académica, investigación/desarrollo, actividades administrativas y demás quehaceres intelectuales constituyen el pilar fundamental de Labory, con tu colaboración Labory es la moneda fuerte, la moneda del Cooperativismo 6.0', 
      boton: '👨‍🏫  Afiliarse como Master de Ciudadan.',
      imagen: ensenando,
      monedas: [mxn, labory],
      claseimagen: 'opcion-imagen-ensanchada',
      url: '/coowork/concejo'
    },
    { 
      titulo: '🚘 Conduciendo:', 
      descripcion: 'Ya sea tu auto particular, taxi, moto o bicicleta para delivery.',
      descripcionCompleta: 'Somos la única plataforma que te paga el 100% del monto en efectivo que pague el usuario, a cambio de que aceptes hasta un 13% en Labory a los usuarios que deseen hacerlo, mismo que te devolvemos multiplicado en Laborys además de tu parte en efectivo. <br /> Además como conductor de nuestro plataforma tienes Beca automáticamente por lo que te podrás graduar como Ingeniero Maker Dev en Cooperativismo 6.0 potenciado por Inteligencia Artificial gratuitamente además contando con múltiples alternativas para incrementar tus ingresos en el proceso al tiempo que te preparas para la nueva era y aportas a la creación de las comunidades ciudadan del Cooperativismo 6.0. <br /> <br /> Si ya eres taxista con nuestro sistema podrás llegar a más pasajeros sin pagar las costosas comisiones de plataforma, obteniendo lo mejor de 2 mundos, si aún no eres taxista nuestra plataforma te ofrece las mejores condiciones.',
      imagen: taxis,
      boton: '🚘 Comenzar a Conducir !!',
      monedas: [mxn, labory],
      claseimagen: 'opcion-imagen-ensanchada-redondeada',
      url: '/taxis/conductor/preregistro#'
    },
    { 
      titulo: '💡 Abriendo tu Agencia Digital i.A. Instantánea', 
      descripcion: 'Al adquirir tu agencia llave en mano obtienes acceso a nuestra completa suite de herramientas. ',
      descripcionCompleta: 'Esto te permitirá empezar a vender soluciones digitales potenciadas por Inteligencia Artificial desde el día 1. <br /> Con nuestras herramientas puedes crear y gestionar sitios web, social marketing, chatbots, generación de imágenes, textos, videos, branding y mucho más, en muy pocos pasos mediante herramientas muy fáciles de usar para las cuales cuentas con la mejor capacitación. <br /> <br /> Tras un año podrás escalar tu agencia siendo tutor en tu sede de UniLab nuestro sistema de becarios, pudiendo llegar a más clientes. <br /> <br /> Dentro de las soluciones de agencia, también cuentas con un GeoNodo, lo que significa que ganas adicionalmente por membresías de usuario de los diversos roles que afilies, como pueden ser taxistas o inversionistas, servicios de scanneo 3d, por compartir una computadora servidor remotamente, compartir Internet dedicado, impresión 3D, y mucho más con esquemas de compensación súper atractivos. <br /> <br /> Un 10% de los ingresos de tu agencia son destinados al crecimiento de la misma para ir recorriendo estas etapas, desbloqueando estos niveles. <br /> <br /> Como parte del Cooperativismo 6.0 con tu agencia no solo ofreces marketing y desarrollo digital, si no también formas parte de la red Ciudadan y obtienes diversas responsabilidades de desarrollo comunitario en tu localidad, aunque con ello grandes recompensas también.',
      boton: '💡 Iniciar.',
      imagen: agencia,
      monedas: [labory],
      claseimagen: 'opcion-imagen-ensanchada',
      url: '/agencias'
    },
    { 
      titulo: '💲 Invirtiendo Inteligente', 
      descripcion: 'Multiplica tu inversión X7  +  Ingresos Adicionales Mensuales. ',
      descripcionCompleta: 'Primer Etapa Corriendo. <br />  Los Ciudadan Investment Tokens, el instrumento de inversión de Ciudadan, respaldan su valor y rendimientos en activos territoriales altamente productivos, así como rentables gracias a las tecnologías de la industria 5.0 y el Cooperativismo 6.0. <br /> <br /> En la primer etapa, en México, se crea la sede matriz de la Paradise UniLab Franchise: Cáñamo Valley, Oaxaca, en donde en 50 Hectáreas vivirán 250 maestros en las áreas de conocimiento de la nueva era citocrática de Cooperativismo 6.0, así como 250 maestros remotos, como núcleo del Consejo de la Gran Confederación Hermandad Global Ciudadan (cuyas posiciones son rotativas y períodicas). Cada uno de los 250 que viviremos en Cáñamo Valley pagamos 10mil pesos mensuales por la adquisición de nuestra casa-huerto-taller, dentro de esta Eco-Villa/Universidad/Laboratorio/Taller/Franquicia. <br /> <br /> En la primer fase se divide a su vez en 2 etapas principales, en la primera se emiten 5mil Ciudadan Investment Tokens, corrspondientes a 250mil dólares de inversión. <br /> <br /> Lo que se ve traducido en que cada token es pagada al 100% con la pura mensualidad de los habitantes de Cáñamo Valley en 3 años. Sin embargo dependiendo de en la etapa y temporada en la que se adquiren, se multiplica la inversión x7, x4   o la que permanecerá durante varias etapas más que es x3....  Los habitantes pagarán por 10 años su espacio en Cáñamo Valley, lo que garantiza el pago de estos rendimientos tan solo de estas mensualidades.... <br /> <br /> Además !.... Ganas rendimientos mensuales de toda la actividad del Núcleo Nacional de Negocios, formado por una serie de talleres en 13 sectores estratégicos base y otros adicionales, con tecnologías de la Industria 5.0 como Impresión 3D, CNC, domótica, robótica, reciclaje plástico, etc. <br /> <br /> Los rendimientos prospectados son incluso superiores a los ofrecidos de base por 3, 7 a 10 años según el token, recibiendo durante todo este período tanto la mensualidad base, como los rendimientos, multiplicando tu inversión al menos por 4, y hasta por 20 o más a lo largo de ese período.',
      imagen: invirtiendo,
      monedas: [mxn],
      claseimagen: 'opcion-imagen-ensanchada',
      boton: '💲 Ir a Zona de Tokens.',
      url: '/cartera/cit'
    },
    { 
      titulo: '🤝 Ciudadaneando', 
      descripcion: 'Ciudadan somos todos los que formamos el Cooperativismo 6.0 por los universos, Ciudadanear es colaborar, es participar, generar comunidad, identidad tanto individual como colectiva.',
      descripcionCompleta: 'Ciudadanear es hacer trueque digital, tekio digital, sembrar huertos colectivos o privados en tu azotea o la de tu condominio, rescatar a las abejas con colmenas, crear consejos vecinales autónomos, Cooperativas de consumo, formales e informales, usando las herramientas de nuestro Eco-Sistema Operativo potenciadas por Inteligencia Artificial y herramientas colaborativas Open Source. <br /> <br /> Gana importantes sumas de Laborys, financiamientos para proyectos y mucho más, sobre todo la integración comunitaria local con tus vecinos para el reempoderamiento ciudadano. <br /> <br /> Gana Laborys cada vez que compartes y/o colaboras, cada vez que te deshaces, prestas o rentas algo que no estás ocupando, que colaboras a alguna necesidad de tu comunidad, etc.  <br /> <br /> Todo esto además de las posibilidades de integrarte a los diversos consejos técnicos y administrativos de la Confederación.', 
      boton: '🤝 Ciudadanear Ahora !!',
      imagen: ciudadaneando,
      monedas: [mxn],
      claseimagen: 'opcion-imagen-ensanchada-redondeada',
      url: '/comunidad/ciudadaneando'
    },
  ];

  const [openMap, setOpenMap] = useState({});

  const handleToggle = (index) => {
    setOpenMap(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleNavigate = (url) => {
    if (url) navigate(url);
  };

  return (
    <div className="ganar-con-ciudadan">
      <div className="opciones-grid">
        {opciones.map((opcion, index) => (
          <div key={index} className="opcion-card">
            <img src={opcion.imagen} alt={opcion.titulo} className={opcion.claseimagen} />
            <h3>{opcion.titulo}</h3>
            <p dangerouslySetInnerHTML={{ __html: opcion.descripcion }} /> {/* Muestra el primer párrafo */}
            <p style={{ display: openMap[index] ? 'block' : 'none' }} dangerouslySetInnerHTML={{ __html: opcion.descripcionCompleta }} />
            <p
              onClick={() => handleToggle(index)}
              style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
            >
              {openMap[index] ? 'Mostrar menos' : '... Mostrar más'}
            </p>

            <button
              type="button"
              className="opcion-boton"
              onClick={() => handleNavigate(opcion.url)}
            >
              {opcion.boton}
            </button>

            <div className="opcion-monedas">
              {opcion.monedas.map((moneda, idx) => (
                <img key={idx} src={moneda} alt="Moneda" className="opcion-moneda" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ganar;