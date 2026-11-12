// Arranque de la versión WebAssembly: inicia el runtime de .NET, conecta el juego con la página y ejecuta Main().
// Puente C# <-> JS:  setModuleImports('catacumbas', {...}) = lo que el juego llama;  exports.JsHost = lo que la página llama.
import { dotnet } from './_framework/dotnet.js';

const msg = (t) => { const s = document.querySelector('#conn span'); if (s) s.textContent = t; };
const PREF = 'catacumbas.';

try {
    msg('Iniciando el motor de .NET…');
    const { setModuleImports, getAssemblyExports, getConfig, runMain } = await dotnet.create();

    setModuleImports('catacumbas', {
        // fotograma del juego (JSON) -> cliente gráfico
        frame: (json, tipo) => { try { window.G.handle(JSON.parse(json)); } catch (e) { console.error('Fotograma', tipo, e); } },
        // partidas guardadas: el sistema de archivos virtual de .NET se sincroniza con localStorage
        cargarArchivos: () => {
            const o = {};
            try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREF)) o[k.slice(PREF.length)] = localStorage.getItem(k); } } catch (e) { /* sin almacenamiento */ }
            return JSON.stringify(o);
        },
        guardarArchivo: (nombre, contenido) => { try { localStorage.setItem(PREF + nombre, contenido); } catch (e) { console.warn('No se pudo guardar', nombre, e); } },
        borrarArchivo: (nombre) => { try { localStorage.removeItem(PREF + nombre); } catch (e) { /* nada */ } },
    });

    const exports = await getAssemblyExports(getConfig().mainAssemblyName);
    // teclado y cuadros de texto: cliente gráfico -> juego
    window.G.hostSend = (o) => {
        if (o.t === 'k') exports.JsHost.Tecla(o.c || '', o.k || '', o.d === 1, !!o.s, !!o.a, !!o.x);
        else if (o.t === 'text') exports.JsHost.Texto(o.v == null ? '' : String(o.v));
    };

    msg('Preparando el mundo…');
    await runMain();                                            // Main() de C#: el juego corre hasta que se elige Salir
    window.G.handle({ k: 'fin' });
} catch (e) {
    console.error(e);
    window.G.handle({ k: 'fin', msg: String(e && e.message || e) });
}
