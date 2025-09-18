import { db, auth } from './firebase.js';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, setDoc, getDoc, writeBatch } from "firebase/firestore";

// --- STATE MANAGEMENT ---
let state = {
    currentView: 'estadisticas-generales',
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    data: {},
    annualData: {},
    annualTotals: {},
    hasChanges: false,
    unsubscribe: null,
    chartInstance: null,
    filesToUpload: {}
};

// --- FORM DEFINITIONS ---
const forms = {
    estadisticasGenerales: {
        title: 'Estadísticas Generales',
        container: 'estadisticas-generales',
        uploadId: 'estadisticas-generales-upload',
        format: 'horizontal',
        structure: [{
            title: '01 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP , EN ACTIVIDADES PRESUNTAMENTE DELICTIVAS',
            items: [{
                subtitle: '0101 PRESUNTAS ACTIVIDADES CONTRA LA VIDA EL CUERPO Y LA SALUD',
                fields: ['PRESUNTO HOMICIDIO', 'PRESUNTO FEMINICIDIO', 'PRESUNTO SICARIATO', 'PRESUNTAS LESIONES LEVES Y GRAVES', 'PRESUNTA EXPOSICION A PELIGRO O ABANDONO DE PERSONAS (EXPOSICION, ABANDONO, OMISION DE SOCORRO Y AUXILIO).']
            }, {
                subtitle: '0102 PRESUNTA ACTIVIDAD CONTRA LA LIBERTAD',
                fields: ['PRESUNTO CONTRA LA LIBERTAD PERSONAL (ACOSO, SECUESTRO)', 'PRESUNTA TRATA DE PERSONAS', 'PRESUNTA VIOLACION LIBERTAD SEXUAL (MAYOR Y MENOR DE EDAD, SEDUCCION, PORNOGRAFIA, TOCAMIENTOS, ACOSO, EXHIBICIONISMO Y CHANTAJE)', 'OTROS PRESUNTOS (LA INTIMIDAD, VIOLACION DE DOMICILIO, COMUNICACIONES, SECRETO PROFESIONAL, DE REUNION, TRABAJO, EXPRESION, PROXENETISMO Y OFENSAS AL PUDOR)']
            }, {
                subtitle: '0103 PRESUNTAS ACTIVIDADES CONTRA EL PATRIMONIO',
                fields: ['PRESUNTO ROBO A PERSONAS (CELULARES, MOCHILAS, CARTERAS, BILLETERAS, RELOGES, JOYAS Y OTROS)', 'PRESUNTO ROBO DE CASA HABITADA', 'PRESUNTO ROBO DE GANADO (ABIGEATO)', 'PRESUNTO ROBO A EMPRESAS PARTICULARES Y ESTATALES', 'PRESUNTO ROBO DE VEHÍCULOS (MAYORES Y MENORES)', 'PRESUNTO ROBO DE ACCESORIOS Y AUTOPARTES', 'PRESUNTO ROBO A PASAJEROS EN VEHICULOS DE TRANSPORTE Y MERCANCIAS EN VEHICULOS DE CARGA Y REPARTIDORES', 'PRESUNTO DAÑO (DAÑAR, DESTRUIR O INUTILIZAR BIEN MUEBLE O INMUEBLE)', 'PRESUNTO HURTO A PERSONAS (CELULARES, MOCHILAS, CARTERAS, BILLETERAS, RELOJES, JOYAS Y OTROS)', 'HURTO DE CASA HABITADA', 'PRESUNTO HURTO DE GANADO (ABIGEATO)', 'PRESUNTO HURTO A EMPRESAS PARTICULARES Y ESTATALES', 'PRESUNTO HURTO DE VEHÍCULOS (MAYORES Y MENORES)', 'PRESUNTO HURTO A PASAJEROS EN VEHICULOS DE TRANSPORTE Y MERCANCIAS EN VEHICULOS DE CARGA Y REPARTIDORES', 'PRESUNTO OTROS (RECEPTACION, APROPIACION ILICITA, ESTAFA, EXTORSION, CHANTAJE Y USURPACION DE INMUEBLE)']
            }, {
                subtitle: '0104 PRESUNTAS ACTIVIDADES CONTRA LA SEG. PUB.',
                fields: ['PRESUNTO PELIGRO COMUN (CREAR INCENDIO O EXPLOSION, CONDUCCION O MANIPULACION EN ESTADO DE EBRIEDAD O DROGADICCIÓN, FABRICACIÓN, TRAFICO O TENECIA DE ARMAS, EXPLOSIVOS Y PIROTECNICOS)', 'PRESUNTO CONTRA EL TRANSPORTE (CONTRA LA SEGURIDAD COMUN Y ENTORPECIMIENTO DEL SERVICIO)']
            }, {
                subtitle: '0105 PRE. ACTIV.CONTRA LA SALUD PUB.',
                fields: ['PRESUNTA CONTAMINACION Y PROPAGACION (CONTAMINACION DE AGUAS, ADULTERACION DE SUSTANCIAS Y COMERCIALIZACION DE PRODUCTOS NOCIVOS)', 'PRESUNTO TRAFICO ILICITO DE DROGAS (PROMOCION, FAVORECIMIENTO, COMERCIALIZACION, PRODUCCION, MICROCOMERCIALIZACION Y POSESION).']
            }, {
                subtitle: '0106 PRE. ACTIV. AMBIENTALES',
                fields: ['PRESUNT ACTIVIDAD CONTRA LOS RECURSOS NATURALES Y MEDIO AMBIENTE (CONTAMINACION, RESIDUOS PELIGROSOS Y MINERIA ILEGAL, )', 'PRESUNTA ACTIVIDAD CONTRA LOS RECURSOS NATURALES (TRAFICO ILEGAL DE ESPECIES ACUATICAS, FLORA Y FAUNA, TALA ILEGAL Y DEFORESTACON DE BOSQUES)']
            }, {
                subtitle: '0107 PRESUNTA ACTIVIDAD CONTRA LA TRANQUILIDAD PUB',
                fields: ['PRESUNTA ACTIVIDAD CONTRA LA PAZ PUBLICA ( DISTURBIOS, APOLOGIA, ORG. CRIMINAL, BANDA Y REGLAJE O MARCAJE)', 'PRESUNTA ACTIVIDAD TERRORISTA (PROVOCA, CREA O MANTIENE ESTADO DE ZOZOBRA, ALARMA O TERROR A LA POBLACION)', 'OTROS PRESUNTOS (DISCRIMINACION, CONTRA LA HUMANIDAD, GENOCIDIO, DESAPARICION FORZADA Y TORTURA)']
            }, {
                subtitle: '0108 PRESUNTAS ACTIV. CONTRA LA ADM. PUB.',
                fields: ['COMETIDOS POR FUNCIONARIOS PÚBLICOS (ABUSO DE AUTORIDAD, MALVERSACIÓN, OTROS)', 'COMETIDOS POR PARTICULARES (USURPACION DE AUTORIDAD, VIOLENCIA Y RESISTENCIA, OTROS)']
            }, {
                subtitle: '0109 PRE. ACTIV. CONTRA LOS PODERES DEL ESTADO',
                fields: ['REBELION (ALZARSE EN ARMAS), SEDICION (DESCONOCER AL GOBIERNO) Y MOTIN (EMPLEAR LA VIOLENCIA Y ATRIBUIRSE DERECHOS DEL PUEBLO Y HACER PETICIONES EN NOMBRE DE ESTE)']
            }]
        }, {
            title: '02 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP EN PRESUNTAS FALTAS',
            items: [{
                subtitle: '0201 PRESUNTA ACTIV. CONTRA CONTRA LA PERSONA',
                fields: ['PRESUNTAS LESIONES (MUY LEVES)', 'PRESUNTO MALTRATO (SIN LESIÓN)', 'PRESUNTAS PELEAS CALLEJERAS CON LESIONES MUY LEVES O SIN LESIONES)', 'PRESUNTA MORDEDURA CANINA, PATADA DE CABALLO O LESIÓN DE ANIMAL DOMESTICO']
            }, {
                subtitle: '0202 PRESUNTA ACTIV. CONTRA EL PATRIMONIO',
                fields: ['HURTO SIMPLE COD. PENAL PERUANO ART. 444 CUANDO LA ACCION RECAE SOBRE UN BIEN CUYO VALOR NO SOBRE PASE EL 10 % DE LA UIT.', 'PRESUNTO DAÑO A LA PROPIEDAD MUEBLE O INMUEBLE', 'PRESUNTO HURTO FAMÉLICO (CONSUMIR Y NO PAGAR)', 'PRESUNTA USURPACION BREVE Y JUEGOS PROHIBIDOS.']
            }, {
                subtitle: '0203 PRE. ACTIV. CONTRA LA SEG. PÚBLICA',
                fields: ['ARROJO DE BASURA O QUEMARLA CAUSANDO MOLESTIAS', 'PRESUNTA OBSTRUCCIÓN Y ARROJO DE ESCOMBROS Y/O MATERIALES. TAMBIEN NO COLOCAR SEÑALES PREVENTIVAS EN LA VIA.', 'CONDUCIR VEHÍCULO NO MOTORIZADO O ANIMAL A EXCESIVA VELOCIDAD /O CONFIAR VEHICULO A MENOR DE EDAD O INEXPERTO']
            }, {
                subtitle: '0204 PRESUNTA ACTIV. CONTRA LAS BUENAS COSTUMBRES',
                fields: ['PRESUNTO CONSUMO DE ALCOHOL O DROGAS PERTURBANDO LA TRANQUILIDAD O SEGURIDAD DE LAS PERSONAS O SUMINISTRARLO A MENORES DE EDAD.', 'PRESUNTA DESTRUCCIÓN DE PLANTAS', 'PRESUNTO ACTOS DE CRUELDAD CONTRA LOS ANIMALES', 'PRESUNTA PROPOSICION INMORAL O DESHONESTA']
            }, {
                subtitle: '0205 PRESUNTA ACTIV. CONTRA LA TRANQUIL. PUB.',
                fields: ['PERTURBAR ACTOS SOLEMNES O REUNIONES PÚBLICAS', 'FALTAMIENTO DE PALABRA A UNA AUTORIDAD', 'OCULTAR SU NOMBRE, DOMICILIO O ESTADO CIVIL A LA AUTORIDAD', 'EL QUE NIEGA AUXILIO A UNA AUTORIDAD PARA SOCORRER A UN TERCERO', 'PERTURBAR CON DISCUSIONES RUIDOS O MOLESTIAS ANALOGAS']
            }]
        }, {
            title: '03 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP Y OTRAS GERENCIAS, EN PRESUNTAS INFRACCIONES',
            items: [{
                subtitle: '0301 PRESUNTOS ACCIDENTES E INFRACCIONES AL TRÁNSITO Y TRANSPORTE',
                fields: ['PRESUNTO ATROPELLO', 'PRESUNTO ATROPELLO Y FUGA', 'PRESUNTO CHOQUE', 'PRESUNTO CHOQUE Y FUGA', 'OTROS PRESUNTOS ACCIDENTES (DESPISTE, VOLCADURA, CAIDA DE PASAJERO E INCENDIO)', 'APOYO SUBSIDIARIO A LA PNP , PARA EL CONTROL DE TRANSITO VEHICULAR CUANDO LO SOLICITE', 'PRESUNTO VEHÍCULO ABANDONADO', 'VEHÍCULOS NO AUTORIZADOS O PROHIBIDOS PARA SERVICIO PÚBLICO', 'VEHÍCULOS QUE HACEN PIQUES Y CARRERAS.', 'PARADEROS Y VEHÍCULOS DE TRANSPORTE PÚBLICO INFORMALES', 'VEHÍCULOS ESTACIONADOS EN ZONA PROHIBIDA', 'OTRAS INFRACCIONES AL RGTO. DE TRÁNSITO.']
            }, {
                subtitle: '0302 PRESUNTA ACTIV. CONTRA LA LEY DE PROTEC. Y BIENESTAR ANIMAL',
                fields: ['LEY Nº 30407 - ANIMALES SENSIBLES , DOMESTICOS, DE GRANJA, SILVESTRES Y ACUÁTICOS Y ANIMALES DE COMPAÑIA O MASCOTAS. (ABANDONO DE ANIMALES EN LA VIA PUBLICA - UTILIZACION DE ANIMALES EN ESPECTACULOS DE ENTRETENIMIENTO PUBLICO O PRIVADO - LA TENENCIA, CAZA, CAPTURA, COMPRA Y VENTA PARA EL CONSUMO HUMANO DE ESPECIES ANIMALES NO DEFINIDAS COMO ANIMALES DE GRANJA, EXCEPTUANDOSE AQUELLAS SILVESTRES CRIADAS EN ZOOCRIADEROS O PROVENIENTES DE AREAS DE MANEJO AUTORIZADAS Y PELEAS DE ANIMALES TANTO DOMESTICOS COMO SILVESTRES EN LUGARES PUBLICOS O PRIVADOS)']
            }, {
                subtitle: '0303 PRESUNTA ACTIV. DE PERSONAS QUE AFECTAN TRANQUILIDAD Y EL ORDEN',
                fields: ['CAMBISTAS EN VÍA PÚBLICA (INTERRUMPEN TRÁNSITO PEATONAL Y VEHICULAR)', 'LLAMADORES, JALADORES Y PARQUEADORES INFORMALES (QUE GRITAN Y SE APROPIAN DE ESPACIOS PUBLICOS)', 'RECICLADORES FORMALES O INFORMALES', 'ORATES Y/O INDIGENTES (AGRESIVOS, QUE EXIGEN DINERO O SE POSESIONAN DE ESPACIOS, INTERRUMPIENDO ACTIVIDADES PUBLICAS O PRIVADAS)', 'PRESUNTAS PERSONAS EN ACTITUD SOSPECHOSA', 'PRESUNTAS PERSONAS EN VEHÍCULOS SOSPECHOSOS', 'PRESUNTOS TRABAJadores SEXUALES EN LA VIA PÚBLICA (MASCULINO O FEMENINO)', 'PRESUNTAS PERSONAS QUE MICCIONAN EN VIA PÚBLICA', 'OTROS PRESUNTOS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }, {
                subtitle: '0304 PRESUNTAS INFRACCIONES A LAS ORDENANZAS Y LICENCIAS MUNICIPALES',
                fields: ['COMERCIO EN VÍA PÚBLICA DISTINTA AL AUTORIZADO', 'COMERCIO EN VÍA PÚBLICA NO AUTORIZADO', 'COMERCIO SIN LICENCIA DE FUNCIONAMIENTO', 'CONSTRUCCIONES SIN LICENCIA MUNICIPAL', 'TRABAJO SEXUAL CLANDESTINO EN INMUEBLE (SALA DE MASAJES, SAUNAS Y OTROS)', 'ESTABLECIMIENTOS EN MALAS CONDICIONES DE LIMPIEZA', 'RUIDOS MOLESTOS', 'OBSTRUCCION DE CALZADA, VEREDA Y OTROS, SIN INDICAR VIA ALTERNA / SIN SEÑALIZACION / SIN MEDIDAS DE SEGURIDAD (CONSTRUCCIONES O REPARACIONES)', 'INGERIR ALCOHOL EN LA VIA PUBLICA', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }]
        }, {
            title: '04 AYUDA Y APOYO A PERSONAS Y ENTIDADES',
            items: [{
                subtitle: '0401 AYUDA, AUXILIO Y RESCATE DE PERSONAS',
                fields: ['RESCATE Y AUXILIO DE PERSONAS', 'AUXILIO VIAL', 'MENORES Y ANCIANOS EN ESTADO DE ABANDONO', 'APOYO AL VECINO', 'PERSONAS EXTRAVIADAS, DESAPARECIDAS Y DESORIENTADAS', 'APOYO AL TURISTA', 'ENTREVISTA POR CONFLICTO VECINAL', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }, {
                subtitle: '0402 APOYO A OTRAS GERENCIAS O AREAS DE LA MUNICIPALIDAD',
                fields: ['FISCALIZACIÓN Y OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }, {
                subtitle: '0403 APOYO A OTRAS ENTIDADES',
                fields: ['POLICÍA NACIONAL Y OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }]
        }, {
            title: '05 EMISION DE ALERTAS TEMPRANAS EN DESASTRES, INFRAESTRUCTURA, SERVICIOS Y ESPACIOS PÚBLICOS AFECTADOS Y EN RIESGO',
            items: [{
                subtitle: '0501 DESASTRES',
                fields: ['HUAYCOS, INUNDACIONES Y DESPLAZAMIENTOS', 'OTROS FENOMENOS NATURALES', 'INCENDIOS', 'AMAGO DE INCENDIOS', 'FUGA DE GAS Y DERRAME DE SUSTANCIAS TÓXICAS', 'CAÍDA DE PUENTES', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }, {
                subtitle: '0502 INFRAESTRUCTURA Y SERVICIOS ESENCIALES AFECTADOS',
                fields: ['CORTE DE FLUIDO ELÉCTRICO / AGUA / INTERNET /GAS / TELEFONO', 'ANIEGOS Y/O PROBLEMAS DE DESAGUE', 'SEMÁFOROS APAGADOS O CON DESPERFECTOS', 'CAÍDA DE POSTES, CABLES, ÁRBOLES U OTROS', 'VIVENDAS COLAPSADAS', 'BUZONES SIN TAPA', 'TRABAJO DE TERCEROS (INFORMAL Y/O SIN CONDICIONES DE SEGURIDAD)', 'OTROS']
            }, {
                subtitle: '0503 ESPACIOS PÚBLICOS EN RIESGO',
                fields: ['PARQUES Y CALLES SIN ILUMINACIÓN O DEFICIENTE', 'OBRAS INCONCLUSAS EN LA VIA PÙBLICA', 'CONSTRUCCIONES ABANDONADAS', 'VIAS SEMI OBSTRUIDAS (POR BACHES PROFUNDOS O GRANCONGESTIÓN VEHICULAR)', 'MOBILIARIO URBANO DETERIORADO Y/O FALTA DE MANTENIMIENTO', 'VENTA DE MERCADERIA USADA (CACHINAS)', 'TALLERES EN LA VIA PÙBLICA', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }]
        }, {
            title: '06 ACONTECIMIENTOS ESPECIALES',
            items: [{
                subtitle: '0601 PRESUNTOS ACONTECIMIENTOS ESPECIALES',
                fields: ['SUICIDIO', 'INTENTO DE SUICIDIO', 'MUERTE REPENTINA E/O NATURAL (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }]
        }, {
            title: '07 OPERATIVOS',
            items: [{
                subtitle: '0701 OPERATIVO MUNICIPAL',
                fields: ['OPERATIVO PREVENTIVO', 'PROTECCIÒN ESCOLAR', 'ACELERAMIENTO Y DESCONGESTION VEHICULAR', 'OTROS OPERATIVOS MUNICIPALES (ESPECIFICAR EN LA SECCIÓN DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }, {
                subtitle: '0702 ESTRATEGIAS Y OPERATIVOS ESPECIALES',
                fields: ['EN APOYO A LA PNP EN PROGRAMAS PREVENTIVOS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)', 'APOYO A OTRAS ENTIDADES EN PROGRAMAS PREVENTIVOS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)', 'SERENAZGO SIN FRONTERAS', 'PATRULLAJE MIXTO (SERENAZGO, JUNTAS VECINALES Y PNP)', 'CONTACTO Y CONTROL CIUDADANO', 'OTROS (ESPECIFICAR EN EL ACAPITE DATOS IMPORTANTES DEL FORMATO DE OCURRENCIAS)']
            }]
        }],
        render: renderAccordionForm
    },
    ocurrenciasSipcop: {
        title: 'Ocurrencias SIPCOP',
        container: 'ocurrencias-sipcop',
        uploadId: 'ocurrencias-sipcop-upload',
        format: 'horizontal',
        structure: [
            {
                title: '01 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP , EN ACTIVIDADES PRESUNTAMENTE DELICTIVAS',
                items: [{
                    subtitle: '',
                    fields: [
                        '0101 PRESUNTAS ACTIVIDADES CONTRA LA VIDA EL CUERPO Y LA SALUD',
                        '0102 PRESUNTA ACTIVIDAD CONTRA LA LIBERTAD',
                        '0103 PRESUNTAS ACTIVIDADES CONTRA EL PATRIMONIO',
                        '0104 PRESUNTAS ACTIVIDADES CONTRA LA SEG. PUB.',
                        '0105 PRE. ACTIV.CONTRA LA SALUD PUB.',
                        '0106 PRE. ACTIV. AMBIENTALES',
                        '0107 PRESUNTA ACTIVIDAD CONTRA LA TRANQUILIDAD PUB',
                        '0108 PRESUNTAS ACTIV. CONTRA LA ADM. PUB.',
                        '0109 PRE. ACTIV. CONTRA LOS PODERES DEL ESTADO'
                    ]
                }]
            },
            {
                title: '02 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP EN PRESUNTAS FALTAS',
                items: [{
                    subtitle: '',
                    fields: [
                        '0201 PRESUNTA ACTIV. CONTRA CONTRA LA PERSONA',
                        '0202 PRESUNTA ACTIV. CONTRA EL PATRIMONIO',
                        '0203 PRE. ACTIV. CONTRA LA SEG. PÚBLICA',
                        '0204 PRESUNTA ACTIV. CONTRA LAS BUENAS COSTUMBRES',
                        '0205 PRESUNTA ACTIV. CONTRA LA TRANQUIL. PUB.'
                    ]
                }]
            },
            {
                title: '03 EMISION DE ALERTAS TEMPRANAS EN APOYO A LA PNP Y OTRAS GERENCIAS, EN PRESUNTAS INFRACCIONES',
                items: [{
                    subtitle: '',
                    fields: [
                        '0301 PRESUNTOS ACCIDENTES E INFRACCIONES AL TRÁNSITO Y TRANSPORTE',
                        '0302 PRESUNTA ACTIV. CONTRA LA LEY DE PROTEC. Y BIENESTAR ANIMAL',
                        '0303 PRESUNTA ACTIV. DE PERSONAS QUE AFECTAN TRANQUILIDAD Y EL ORDEN',
                        '0304 PRESUNTAS INFRACCIONES A LAS ORDENANZAS Y LICENCIAS MUNICIPALES'
                    ]
                }]
            },
            {
                title: '04 AYUDA Y APOYO A PERSONAS Y ENTIDADES',
                items: [{
                    subtitle: '',
                    fields: [
                        '0401 AYUDA, AUXILIO Y RESCATE DE PERSONAS',
                        '0402 APOYO A OTRAS GERENCIAS O AREAS DE LA MUNICIPALIDAD',
                        '0403 APOYO A OTRAS ENTIDADES'
                    ]
                }]
            },
            {
                title: '05 EMISION DE ALERTAS TEMPRANAS EN DESASTRES, INFRAESTRUCTURA, SERVICIOS Y ESPACIOS PÚBLICOS AFECTADOS Y EN RIESGO',
                items: [{
                    subtitle: '',
                    fields: [
                        '0501 DESASTRES',
                        '0502 INFRAESTRUCTURA Y SERVICIOS ESENCIALES AFECTADOS',
                        '0503 ESPACIOS PÚBLICOS EN RIESGO'
                    ]
                }]
            },
            {
                title: '06 ACONTECIMIENTOS ESPECIALES',
                items: [{
                    subtitle: '',
                    fields: [
                        '0601 PRESUNTOS ACONTECIMIENTOS ESPECIALES'
                    ]
                }]
            },
            {
                title: '07 OPERATIVOS',
                items: [{
                    subtitle: '',
                    fields: [
                        '0701 OPERATIVO MUNICIPAL',
                        '0702 ESTRATEGIAS Y OPERATIVOS ESPECIALES'
                    ]
                }]
            }
        ],
        render: renderAccordionForm
    },
    delitosComisaria: {
        title: 'Delitos por Comisaría',
        container: 'form-delitos-comisaria',
        uploadId: 'delitos-comisaria-upload',
        format: 'vertical',
        structure: ['Hurto (Chorrillos)', 'Robo (Chorrillos)', 'Hurto (Villa)', 'Robo (Villa)', 'Hurto (Mateo)', 'Robo (Mateo)', 'Hurto (San Genaro)', 'Robo (San Genaro)'],
        render: renderSimpleForm
    },
    observatorioDelito: {
        title: 'Observatorio del Delito',
        container: 'form-observatorio-delito',
        uploadId: 'observatorio-delito-upload',
        format: 'horizontal',
        structure: ['Administración pública (delito)', 'Adolescente infractor de la ley penal', 'Contravención a los derechos de los niños y adolescentes', 'Derechos intelectuales (delito)', 'Faltas', 'Familia (delito)', 'Fe publica (delito)', 'Honor (delito)', 'Humanidad (delito)', 'Ley 30096 delitos informáticos, modificada por la ley 30171', 'Ley de violencia contra la mujer y los integrantes del grupo familiar', 'Omisión a la asistencia familiar', 'Peligro común (delito)', 'Patrimonio (delito)', 'Seguridad pública (delito)', 'Tranquilidad publica (delito)', 'Vida, cuerpo y salud (delito)'],
        render: renderSimpleForm
    },
    operativosPatrullaje: {
        title: 'Operativos y Patrullaje',
        container: 'form-operativos-patrullaje',
        uploadId: 'operativos-patrullaje-upload',
        format: 'vertical',
        structure: ['Operativos Serenazgo', 'Op. Escuadrón Verde', 'Op. con Halcones', 'Patrullaje Integrado', 'Patrullaje por Convenio', 'Brigada Canina'],
        render: renderSimpleForm
    },
    frustracionRobos: {
        title: 'Frustración de Robos',
        container: 'form-frustracion-robos',
        uploadId: 'frustracion-robos-upload',
        format: 'vertical',
        structure: ['01 Chorrillos Centro', '02 Matellini', '03 Pumacahua', '04 San Genaro', '05 Cedros de Villa'],
        render: renderSimpleForm
    },
    personalSerenazgo: {
        title: 'Personal Serenazgo',
        container: 'form-personal-serenazgo',
        uploadId: 'personal-serenazgo-upload',
        format: 'vertical',
        structure: ['A Pie', 'Motorizado', 'Conductor', 'Olaya', 'Ichma', 'Brigada Canina', 'Gestores', 'Prevención'],
        render: renderSimpleForm
    },
    personalCecop: {
        title: 'Personal CECOP',
        container: 'form-personal-cecop',
        uploadId: 'personal-cecop-upload',
        format: 'vertical',
        structure: ['Administracion', 'Nro. Operadores', 'Nro. Supervisores'],
        render: renderSimpleForm
    },
    vehiculos: {
        title: 'Vehículos (Motos)',
        container: 'form-vehiculos',
        uploadId: 'vehiculos-upload',
        format: 'vertical',
        structure: ['Nro. Operativas', 'Nro. en Mantenimiento', 'Nro. Inoperativas', 'Nro. Patrullajes', 'Nro. Intervenciones', 'Nro. Incidencias'],
        render: renderVehiculosForm
    }
};

// --- DOM ELEMENTS ---
const sidebarNav = document.getElementById('sidebar-nav');
const viewTitle = document.getElementById('view-title');
const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');
const saveButton = document.getElementById('save-button');
const saveButtonText = document.getElementById('save-button-text');
const contentDiv = document.getElementById('content');
const loadingDiv = document.getElementById('loading');
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const googleSignInButton = document.getElementById('google-signin-button');

// --- RENDERING FUNCTIONS ---
function toSlug(str) {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return str.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}

function createInputField(key, label, value) {
    return `
        <div class="mb-4">
            <label for="${key}" class="block text-sm font-medium text-gray-600 mb-1">${label}</label>
            <input type="number" id="${key}" data-key="${key}" value="${value || ''}" min="0" class="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-sky-500 focus:border-sky-500">
        </div>
    `;
}

function renderSimpleForm(formDef, data) {
    const container = document.getElementById(formDef.container);
    if (!container) return;
    let html = '';
    formDef.structure.forEach(field => {
        const key = `${toSlug(formDef.title)}_${toSlug(field)}`;
        html += createInputField(key, field, data[key]);
    });
    container.innerHTML = html;
}

function renderVehiculosForm(formDef, data) {
    const container = document.getElementById(formDef.container);
    if (!container) return;
    let html = '';
    const keys = {};
    formDef.structure.forEach(field => {
        const key = `${toSlug(formDef.title)}_${toSlug(field)}`;
        keys[field] = key;
        html += createInputField(key, field, data[key]);
    });
    const totalOperativas = (data[keys['Nro. Operativas']] || 0) + (data[keys['Nro. en Mantenimiento']] || 0) + (data[keys['Nro. Inoperativas']] || 0);
    html += `
        <div class="mb-4 mt-2 pt-4 border-t">
            <label for="vehiculos-total" class="block text-sm font-medium text-gray-800 mb-1">Total Unidades</label>
            <input type="number" id="vehiculos-total" value="${totalOperativas}" min="0" class="w-full p-2 border bg-gray-200 border-gray-300 rounded-md shadow-sm cursor-not-allowed" disabled>
        </div>
    `;
    container.innerHTML = html;
}

function renderAccordionForm(formDef, data) {
    const container = document.getElementById(formDef.container);
    if (!container) return;
    let html = '<div class="space-y-4">';
    formDef.structure.forEach((section, sectionIndex) => {
        html += `
            <div>
                <div class="accordion-header bg-gray-50 hover:bg-gray-100" data-section="${sectionIndex}">
                    <h3 class="font-semibold text-gray-700">${section.title}</h3>
                    <i data-lucide="chevron-down" class="accordion-arrow w-5 h-5"></i>
                </div>
                <div class="accordion-content" id="accordion-content-${sectionIndex}">
        `;
        section.items.forEach(item => {
            if (item.subtitle) {
                html += `<h4 class="font-medium text-sky-800 mt-4 mb-2">${item.subtitle}</h4>`;
            }
            html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6">';
            item.fields.forEach(field => {
                const key = `${toSlug(formDef.title)}_${toSlug(section.title)}_${toSlug(field)}`;
                html += createInputField(key, field, data[key]);
            });
            html += '</div>';
        });
        html += '</div></div>';
    });
    html += '</div>';
    container.innerHTML = html;
    container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('open');
            const content = header.nextElementSibling;
            content.style.display = content.style.display === 'block' ? 'none' : 'block';
        });
    });
}

function renderAllForms() {
    loadingDiv.style.display = 'none';
    contentDiv.classList.remove('hidden');
    for (const formKey in forms) {
        try {
            const formDef = forms[formKey];
            if (document.getElementById(formDef.container)) {
                formDef.render(formDef, state.data || {});
            }
        } catch (e) {
            console.error(`Error rendering form: ${formKey}`, e);
        }
    }
    updateView();
    lucide.createIcons();
}

function updateView() {
    const isReportView = state.currentView === 'reports';
    const isUploadView = state.currentView === 'bulk-upload';
    const isExportView = state.currentView === 'export';

    monthSelect.style.display = (isReportView || isUploadView || isExportView) ? 'none' : 'block';
    saveButton.style.display = (isReportView || isUploadView || isExportView) ? 'none' : 'block';

    sidebarNav.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === state.currentView);
    });

    const activeLink = sidebarNav.querySelector(`[data-view="${state.currentView}"]`);
    viewTitle.textContent = activeLink ? activeLink.querySelector('span').textContent : 'Dashboard';

    document.querySelectorAll('.data-section').forEach(section => {
        section.classList.toggle('active', section.id === state.currentView);
    });

    if (isExportView) {
        populateExportFilters();
    }
}

// --- DATA HANDLING ---
function loadMonthlyData() {
    if (state.unsubscribe) state.unsubscribe();
    loadingDiv.style.display = 'flex';
    contentDiv.classList.add('hidden');

    const docId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const docRef = doc(db, 'statistics', docId);

    state.unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            state.data = docSnap.data();
        } else {
            console.log(`Document ${docId} does not exist. Creating new one locally.`);
            state.data = {};
        }
        state.hasChanges = false;
        updateSaveButton();
        renderAllForms();
    }, (error) => {
        console.error("Error fetching document:", error);
        loadingDiv.innerHTML = `<p class="text-red-500">Error al cargar datos. Revise la consola.</p>`;
    });
}

async function loadAnnualData() {
    loadingDiv.style.display = 'flex';
    contentDiv.classList.add('hidden');
    state.annualData = {};
    const promises = [];
    for (let month = 1; month <= 12; month++) {
        const docId = `${state.currentYear}-${String(month).padStart(2, '0')}`;
        const docRef = doc(db, 'statistics', docId);
        promises.push(getDoc(docRef));
    }

    try {
        const docSnaps = await Promise.all(promises);
        docSnaps.forEach((docSnap, index) => {
            const month = index + 1;
            if (docSnap.exists()) {
                state.annualData[month] = docSnap.data();
            } else {
                state.annualData[month] = {};
            }
        });
        calculateTotals();
        renderReportView();
    } catch (error) {
        console.error("Error fetching annual data:", error);
        contentDiv.innerHTML = `<p class="text-red-500">Error al cargar datos anuales. Revise la consola.</p>`;
    } finally {
        loadingDiv.style.display = 'none';
        contentDiv.classList.remove('hidden');
    }
}

async function saveData() {
    if (!state.hasChanges) return;
    saveButton.disabled = true;
    saveButtonText.textContent = 'Guardando...';

    const docId = `${state.currentYear}-${String(state.currentMonth).padStart(2, '0')}`;
    const docRef = doc(db, 'statistics', docId);

    try {
        await setDoc(docRef, state.data, {
            merge: true
        });
        state.hasChanges = false;
        saveButtonText.textContent = 'Guardado ✓';
        setTimeout(() => {
            updateSaveButton();
        }, 2000);
    } catch (error) {
        console.error("Error saving data:", error);
        saveButtonText.textContent = 'Error al guardar';
    } finally {
        saveButton.disabled = false;
    }
}


function handleInputChange(e) {
    if (e.target.matches('input[type="number"]')) {
        const key = e.target.dataset.key;
        const value = e.target.value === '' ? null : Number(e.target.value);
        if (key) {
            state.data[key] = value;
            state.hasChanges = true;
            updateSaveButton();
            if (key.startsWith('vehiculos_nro-operativas') || key.startsWith('vehiculos_nro-en-mantenimiento') || key.startsWith('vehiculos_nro-inoperativas')) {
                updateVehiculosTotal();
            }
        }
    }
}

function updateVehiculosTotal() {
    const operativas = Number(document.getElementById('vehiculos_nro-operativas')?.value) || 0;
    const mantenimiento = Number(document.getElementById('vehiculos_nro-en-mantenimiento')?.value) || 0;
    const inoperativas = Number(document.getElementById('vehiculos_nro-inoperativas')?.value) || 0;
    const totalInput = document.getElementById('vehiculos-total');
    if (totalInput) {
        totalInput.value = operativas + mantenimiento + inoperativas;
    }
}

function updateSaveButton() {
    if (state.hasChanges) {
        saveButton.disabled = false;
        saveButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
        saveButton.classList.add('bg-sky-600', 'hover:bg-sky-700');
        saveButtonText.textContent = 'Guardar Cambios';
    } else {
        saveButton.disabled = true;
        saveButton.classList.add('bg-gray-400', 'cursor-not-allowed');
        saveButton.classList.remove('bg-sky-600', 'hover:bg-sky-700');
        saveButtonText.textContent = 'Guardar Cambios';
    }
}

// --- REPORTING & CHARTING ---
function calculateTotals() {
    const totals = {
        byCategory: {},
        annualByCategory: {},
        annualByForm: {}
    };
    for (const formKey in forms) {
        const formDef = forms[formKey];
        let formTotal = 0;
        const getFields = (structure) => {
            if (typeof structure[0] === 'string') {
                return structure.map(s => ({
                    title: formDef.title,
                    field: s
                }));
            }
            return structure.flatMap(section => section.items.flatMap(item => item.fields.map(field => ({
                title: formDef.title,
                field
            }))));
        };
        const fields = getFields(formDef.structure);
        fields.forEach(({
            title,
            field
        }) => {
            const key = `${toSlug(title)}_${toSlug(field)}`;
            const monthlyValues = [];
            let annualTotal = 0;
            for (let month = 1; month <= 12; month++) {
                const value = (state.annualData[month] && state.annualData[month][key]) || 0;
                monthlyValues.push(value);
                annualTotal += value;
            }
            totals.byCategory[key] = monthlyValues;
            totals.annualByCategory[key] = annualTotal;
            formTotal += annualTotal;
        });
        totals.annualByForm[formDef.title] = formTotal;
    }
    state.annualTotals = totals;
}

function renderReportView() {
    populateChartCategorySelect();
    renderAnnualTotalsTable();
    updateChart();
}

function populateChartCategorySelect() {
    const select = document.getElementById('chart-category-select');
    select.innerHTML = '';
    for (const formKey in forms) {
        const formDef = forms[formKey];
        const optgroup = document.createElement('optgroup');
        optgroup.label = formDef.title;
        const getFields = (structure) => {
            if (typeof structure[0] === 'string') return structure;
            return structure.flatMap(s => s.items.flatMap(i => i.fields));
        };
        const fields = getFields(formDef.structure);
        fields.forEach(field => {
            const option = document.createElement('option');
            const key = `${toSlug(formDef.title)}_${toSlug(field)}`;
            option.value = key;
            option.textContent = field;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    }
}

function renderAnnualTotalsTable() {
    const tableBody = document.getElementById('annual-totals-table');
    let html = '';
    for (const formTitle in state.annualTotals.annualByForm) {
        const total = state.annualTotals.annualByForm[formTitle];
        html += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formTitle}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${total.toLocaleString('es-PE')}</td>
            </tr>
        `;
    }
    tableBody.innerHTML = html;
}

function updateChart() {
    const select = document.getElementById('chart-category-select');
    const selectedKey = select.value;
    if (!selectedKey || !state.annualTotals.byCategory[selectedKey]) return;
    const ctx = document.getElementById('monthly-chart').getContext('2d');
    const chartData = state.annualTotals.byCategory[selectedKey];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    if (state.chartInstance) state.chartInstance.destroy();
    state.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [{
                label: select.options[select.selectedIndex].text,
                data: chartData,
                backgroundColor: 'rgba(14, 165, 233, 0.6)',
                borderColor: 'rgba(14, 165, 233, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

// --- BULK UPLOAD ---
function renderUploadForm() {
    const container = document.getElementById('upload-form');
    let html = '';
    for (const key in forms) {
        const formDef = forms[key];
        html += `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <label for="${formDef.uploadId}" class="text-gray-700 font-medium">${formDef.title}</label>
                <div class="flex items-center space-x-2">
                    <span id="${formDef.uploadId}-status" class="text-sm text-gray-500 italic">Ningún archivo seleccionado</span>
                    <div class="file-upload-wrapper">
                        <button class="btn-upload">Seleccionar archivo...</button>
                        <input type="file" id="${formDef.uploadId}" data-form-key="${key}" accept=".csv">
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    container.querySelectorAll('input[type=file]').forEach(input => {
        input.addEventListener('change', handleFileSelect);
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    const formKey = e.target.dataset.formKey;
    if (file) {
        state.filesToUpload[formKey] = file;
        document.getElementById(`${forms[formKey].uploadId}-status`).textContent = file.name;
        document.getElementById(`${forms[formKey].uploadId}-status`).classList.remove('text-red-500');
    }
}

async function handleBulkUpload() {
    const uploadStatus = document.getElementById('upload-status');
    uploadStatus.innerHTML = `<p class="text-yellow-600">La carga masiva está deshabilitada en el modo local.</p>`;
    console.log("Carga masiva deshabilitada en modo local.");
    return;
}

// --- EXPORT ---
function populateExportFilters() {
    const sectionSelect = document.getElementById('export-section-select');
    sectionSelect.innerHTML = '';
    for (const formKey in forms) {
        const option = document.createElement('option');
        option.value = formKey;
        option.textContent = forms[formKey].title;
        sectionSelect.appendChild(option);
    }
    populateSubCategoryFilter();
}

function populateSubCategoryFilter() {
    const sectionSelect = document.getElementById('export-section-select');
    const categorySelect = document.getElementById('export-category-select');
    const selectedFormKey = sectionSelect.value;
    const formDef = forms[selectedFormKey];
    categorySelect.innerHTML = '<option value="all">Exportar toda la sección</option>';
    if (formDef.format === 'horizontal') {
        formDef.structure.forEach(section => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = section.title;
            section.items.forEach(item => {
                item.fields.forEach(field => {
                    const option = document.createElement('option');
                    option.value = `${toSlug(formDef.title)}_${toSlug(field)}`;
                    option.textContent = field;
                    optgroup.appendChild(option);
                });
            });
            categorySelect.appendChild(optgroup);
        });
    } else { // Vertical
        formDef.structure.forEach(field => {
            const option = document.createElement('option');
            option.value = `${toSlug(formDef.title)}_${toSlug(field)}`;
            option.textContent = field;
            categorySelect.appendChild(option);
        });
    }
}

async function handleExport() {
    const exportStatus = document.getElementById('export-status');
    const exportBtn = document.getElementById('export-btn');
    exportBtn.disabled = true;
    exportStatus.innerHTML = `<div class="flex items-center justify-center text-sky-600"><div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-sky-500 mr-3"></div>Generando reporte...</div>`;

    await loadAnnualData(); // Ensure data is loaded

    const year = state.currentYear;
    const sectionKey = document.getElementById('export-section-select').value;
    const categoryKey = document.getElementById('export-category-select').value;
    const formDef = forms[sectionKey];
    const annualDataForExport = state.annualData;

    let csvData = [];
    let headers = [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const processFields = (fieldsToProcess) => {
        fieldsToProcess.forEach(field => {
            const row = [field.name];
            let total = 0;
            for (let month = 1; month <= 12; month++) {
                const value = (annualDataForExport[month]?.[field.key]) || 0;
                row.push(value);
                total += value;
            }
            row.push(total);
            csvData.push(row);
        });
    };

    if (formDef.format === 'vertical') {
        headers = ['Mes'];
        let fieldsToExport = [];
        if (categoryKey === 'all') {
            fieldsToExport = formDef.structure.map(field => ({ name: field, key: `${toSlug(formDef.title)}_${toSlug(field)}` }));
        } else {
            const fieldName = formDef.structure.find(f => `${toSlug(formDef.title)}_${toSlug(f)}` === categoryKey);
            if (fieldName) fieldsToExport.push({ name: fieldName, key: categoryKey });
        }
        headers.push(...fieldsToExport.map(f => f.name));
        csvData.push(headers);

        for (let i = 0; i < 12; i++) {
            const month = i + 1;
            const row = [months[i]];
            fieldsToExport.forEach(field => {
                const value = (annualDataForExport[month]?.[field.key]) || 0;
                row.push(value);
            });
            csvData.push(row);
        }
    } else { // Horizontal
        headers = ['Tipo de Ocurrencia', ...months, 'Total Anual'];
        csvData.push(headers);

        if (categoryKey === 'all') {
            formDef.structure.forEach(section => {
                csvData.push([`"${section.title}"`]); // Main title as a row
                section.items.forEach(item => {
                    if (item.subtitle) csvData.push([`"${item.subtitle}"`]); // Subtitle as a row
                    const fieldsToExport = item.fields.map(field => {
                        const fieldSlug = toSlug(field);
                        const sectionSlug = toSlug(section.title);
                        return {
                            name: field,
                            key: `${toSlug(formDef.title)}_${sectionSlug}_${fieldSlug}`
                        };
                    });
                    processFields(fieldsToExport);
                });
            });
        } else {
            const { fieldName, sectionTitle } = findFieldNameAndSectionByKey(formDef, categoryKey);
            if (fieldName) {
                const fieldsToExport = [{ name: fieldName, key: categoryKey }];
                processFields(fieldsToExport);
            }
        }
    }

    let csvContent = "";
    csvData.forEach(rowArray => {
        let row = rowArray.map(item => {
            let cell = String(item || '').replace(/"/g, '""');
            if (cell.includes(',')) cell = `"${cell}"`;
            return cell;
        }).join(',');
        csvContent += row + '\r\n';
    });

    exportBtn.disabled = false;
    exportStatus.innerHTML = '';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = `${formDef.title.replace(/ /g, "_")}_${year}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function findFieldNameAndSectionByKey(formDef, keyToFind) {
    let found = { fieldName: null, sectionTitle: null };
    if (formDef.format !== 'horizontal') return found;

    formDef.structure.forEach(section => {
        section.items.forEach(item => {
            item.fields.forEach(field => {
                const fieldSlug = toSlug(field);
                const sectionSlug = toSlug(section.title);
                const key = `${toSlug(formDef.title)}_${sectionSlug}_${fieldSlug}`;
                if (key === keyToFind) {
                    found = { fieldName: field, sectionTitle: section.title };
                }
            });
        });
    });
    return found;
}


// --- INITIALIZATION ---
function initApp() {
    // Populate year select
    for (let i = 2030; i >= 2020; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
    yearSelect.value = state.currentYear;
    monthSelect.value = state.currentMonth;

    // Event Listeners
    sidebarNav.addEventListener('click', (e) => {
        const link = e.target.closest('.sidebar-link');
        if (link && link.dataset.view) {
            state.currentView = link.dataset.view;
            if (state.currentView === 'reports' || state.currentView === 'export') {
                if (state.currentView === 'export') {
                     populateExportFilters();
                }
                loadAnnualData().then(() => {
                    if (state.currentView === 'reports') {
                        renderReportView();
                    }
                });
            } else if (state.currentView === 'bulk-upload') {
                renderUploadForm();
                updateView();
            } else {
                loadMonthlyData();
            }
            updateView();
        }
    });

    yearSelect.addEventListener('change', (e) => {
        state.currentYear = Number(e.target.value);
        if (state.currentView === 'reports' || state.currentView === 'export') {
            loadAnnualData().then(() => {
                if (state.currentView === 'reports') {
                    renderReportView();
                }
                if (state.currentView === 'export') {
                    // Maybe re-export or update something
                }
            });
        } else {
            loadMonthlyData();
        }
    });

    monthSelect.addEventListener('change', (e) => {
        state.currentMonth = Number(e.target.value);
        loadMonthlyData();
    });

    saveButton.addEventListener('click', saveData);
    contentDiv.addEventListener('input', handleInputChange);

    document.getElementById('chart-category-select')?.addEventListener('change', updateChart);
    document.getElementById('upload-btn')?.addEventListener('click', handleBulkUpload);
    document.getElementById('export-btn')?.addEventListener('click', handleExport);
    document.getElementById('export-section-select')?.addEventListener('change', populateSubCategoryFilter);

    // Initial Load
    loadMonthlyData();
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, user => {
    if (user) {
        // User is signed in.
        loginContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        initApp();
    } else {
        // User is signed out.
        loginContainer.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value;
    const password = loginForm.password.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.textContent = '';
    } catch (error) {
        loginError.textContent = 'Error: Usuario o contraseña incorrectos.';
        console.error("Login error:", error);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout error:", error);
    }
});

googleSignInButton.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        loginError.textContent = '';
    } catch (error) {
        loginError.textContent = 'Error al iniciar sesión con Google.';
        console.error("Google sign-in error:", error);
    }
});
