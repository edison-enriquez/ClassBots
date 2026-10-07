/* Motor del taller: analiza un subconjunto de Java, lo traduce a JS y registra eventos. */
const PRIM=new Set(['int','double','float','long','short','byte','boolean','char','String','void']);
const INTS=new Set(['int','long','short','byte']);
/* Excepciones de Java que el taller conoce (hijo → padre) */
const EXC_PADRE={Throwable:null,Exception:'Throwable',RuntimeException:'Exception',IllegalArgumentException:'RuntimeException',IllegalStateException:'RuntimeException',ArithmeticException:'RuntimeException',NullPointerException:'RuntimeException',IndexOutOfBoundsException:'RuntimeException',ClassCastException:'RuntimeException',NumberFormatException:'IllegalArgumentException',UnsupportedOperationException:'RuntimeException'};
const CONOCIDOS=new Set(['ArrayList','List','Object','Integer','Double','Boolean','Character','Long','Float','Short','Byte','Number','Math','Comparable','Collections','Arrays',...Object.keys(EXC_PADRE)]);
/* Métodos que toda clase hereda de Object (firma → tipo de retorno) */
const DE_OBJECT={'toString()':'String','equals(Object)':'boolean','hashCode()':'int'};
const ENVOLTORIO={int:'Integer',double:'Double',boolean:'Boolean',char:'Character',long:'Long',float:'Float',short:'Short',byte:'Byte'};
/* Cadena de ancestros de una clase, pasando de las clases del estudiante a las de Java */
function ancestros(clases,n){const r=[];let x=n,k=0;while(x&&k++<40&&!r.includes(x)){r.push(x);x=clases[x]?(clases[x].__padre||(clases[x].hereda&&tipoBase(clases[x].hereda) in EXC_PADRE?tipoBase(clases[x].hereda):null)):(EXC_PADRE[x]??null);}return r;}
const esLanzable=(clases,n)=>ancestros(clases,n).includes('Throwable');
const esComprobada=(clases,n)=>{const a=ancestros(clases,n);return a.includes('Throwable')&&!a.includes('RuntimeException');};
const esSubtipoExc=(clases,a,b)=>ancestros(clases,a).includes(b);
const PALABRAS=new Set(['return','new','else','throw','case','final','var','break','continue','do','this','super','if','for','while','switch','default','static','public','private','protected','class','import','package']);

class JavaError extends Error{constructor(msg){super(msg);this.java=true;}}

function blankComments(src){
  let out='',i=0;const n=src.length;
  while(i<n){
    const c=src[i],d=src[i+1];
    if(c==='"'||c==="'"){let j=i+1;while(j<n&&src[j]!==c&&src[j]!=='\n'){if(src[j]==='\\')j++;j++;}out+=src.slice(i,Math.min(j+1,n));i=j+1;continue;}
    if(c==='/'&&d==='/'){while(i<n&&src[i]!=='\n'){out+=' ';i++;}continue;}
    if(c==='/'&&d==='*'){let j=i+2;while(j<n&&!(src[j]==='*'&&src[j+1]==='/'))j++;j=Math.min(j+2,n);for(let k=i;k<j;k++)out+=src[k]==='\n'?'\n':' ';i=j;continue;}
    out+=c;i++;
  }
  return out;
}
function blankStrings(s){return s.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,m=>m[0]+' '.repeat(Math.max(0,m.length-2))+m[m.length-1]);}
function lineaEn(s,idx){let n=1;for(let i=0;i<idx&&i<s.length;i++)if(s[i]==='\n')n++;return n;}
function llaveFinal(s,open){let d=0;for(let i=open;i<s.length;i++){if(s[i]==='{')d++;else if(s[i]==='}'){d--;if(d===0)return i;}}return -1;}
function partirComas(s){const r=[];let d=0,q=null,a=0;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='\\')i++;else if(c===q)q=null;continue;}if(c==='"'||c==="'")q=c;else if('(<[{'.includes(c))d++;else if(')>]}'.includes(c))d--;else if(c===','&&d===0){r.push(s.slice(a,i));a=i+1;}}r.push(s.slice(a));return r.map(x=>x.trim()).filter(Boolean);}
function visDe(mods){return /\bprivate\b/.test(mods)?'private':/\bprotected\b/.test(mods)?'protected':/\bpublic\b/.test(mods)?'public':'package';}
function tipoBase(t){return t.replace(/<.*>/,'').replace(/\[\]|\.\.\./g,'').trim();}
const E=(archivo,linea,msg)=>({archivo,linea,msg});

function lintCuerpo(blank,lineaIni,archivo,errores){
  const ls=blank.split('\n');
  for(let k=0;k<ls.length;k++){
    let t=ls[k];
    if(k===0)t=t.slice(t.indexOf('{')+1);
    if(k===ls.length-1)t=t.slice(0,t.lastIndexOf('}'));
    t=t.trim();
    if(!t)continue;
    const dec=/^([a-z][\w$]*)\s+([A-Za-z_$][\w$]*)\s*(=|;)/.exec(t);
    if(dec&&!PRIM.has(dec[1])&&!PALABRAS.has(dec[1])){
      const sug=dec[1]==='string'?'String':dec[1][0].toUpperCase()+dec[1].slice(1);
      errores.push(E(archivo,lineaIni+k,`No encuentro el tipo «${dec[1]}». ¿Querías escribir ${sug}?`));continue;
    }
    if(/[;{}]$/.test(t))continue;
    if(/^(if|else|for|while|do|switch|case|default)\b/.test(t))continue;
    if(/[,(+\-*/&|=?:<>]$/.test(t))continue;
    let sig='';for(let j=k+1;j<ls.length;j++){if(ls[j].trim()){sig=ls[j].trim();break;}}
    if(/^[.+\-*/&|?:)]/.test(sig))continue;
    errores.push(E(archivo,lineaIni+k,'Parece que falta ; al final de esta línea.'));
  }
}

function parsePrograma(files){
  const errores=[],clases={};
  for(const [archivo,src] of Object.entries(files)){
    const clean=blankComments(src),blank=blankStrings(clean);
    const L=i=>lineaEn(blank,i);
    blank.split('\n').forEach((ln,k)=>{if(((ln.match(/"/g)||[]).length)%2)errores.push(E(archivo,k+1,'Una cadena de texto no se cerró: falta una comilla ".'));});
    let bal=0,ultimaAbierta=0;
    for(let i=0;i<blank.length;i++){if(blank[i]==='{'){bal++;ultimaAbierta=i;}else if(blank[i]==='}'){bal--;if(bal<0){errores.push(E(archivo,L(i),'Sobra una llave } en esta línea.'));break;}}}
    if(bal>0)errores.push(E(archivo,L(ultimaAbierta),'Falta cerrar una llave }. Cada { necesita su }.'));
    if(bal!==0)continue;
    const fuera=(txt,base)=>{
      const limpio=txt.replace(/\b(import|package)\b[^;]*;/g,m=>' '.repeat(m.length));
      const k=limpio.search(/\S/);if(k<0)return;
      const trozo=limpio.slice(k,k+40);
      if(/^Class\b/.test(trozo))errores.push(E(archivo,L(base+k),'La palabra clave class se escribe en minúscula.'));
      else errores.push(E(archivo,L(base+k),'Hay código fuera de una clase. En Java todo vive dentro de class Nombre { ... }.'));
    };
    const reC=/\b((?:(?:public|private|protected|abstract|final|static)\s+)*)(class|interface)\s+([A-Za-z_$][\w$]*)\s*((?:extends|implements)[^{]*)?\{/g;
    let m,cursor=0;
    while((m=reC.exec(blank))){
      const open=m.index+m[0].length-1,close=llaveFinal(blank,open);
      fuera(blank.slice(cursor,m.index),cursor);
      cursor=close+1;reC.lastIndex=close+1;
      const nombre=m[3],mods=m[1]||'',esInterfaz=m[2]==='interface',cab=(m[4]||'').replace(/\s+/g,' ');
      const c={nombre,archivo,linea:L(m.index),tipo:esInterfaz?'interface':'clase',abstracta:/\babstract\b/.test(mods),final:/\bfinal\b/.test(mods),publica:/public/.test(mods),
        implementa:[],hereda:null,campos:[],ctors:[],metodos:[],cuerpoClean:clean.slice(open,close+1),cuerpoBlank:blank.slice(open,close+1)};
      const ext=/\bextends\s+([\w$<>,\s]+?)(?=\s+implements\b|$)/.exec(cab),imp=/\bimplements\s+([\w$<>,\s]+)$/.exec(cab);
      if(imp)c.implementa=partirComas(imp[1]).map(x=>x.replace(/\s+/g,''));
      if(ext){
        if(esInterfaz)c.implementa.push(...partirComas(ext[1]).map(x=>x.replace(/\s+/g,'')));
        else c.hereda=ext[1].trim();
      }
      if(clases[nombre])errores.push(E(archivo,c.linea,`${esInterfaz?'La interfaz':'La clase'} ${nombre} está declarada dos veces.`));
      if(c.publica&&archivo!==nombre+'.java')errores.push(E(archivo,c.linea,`${esInterfaz?'La interfaz pública':'La clase pública'} ${nombre} debe estar en un archivo llamado ${nombre}.java.`));
      miembros(c,clean,blank,open+1,close,archivo,L,errores);
      if(esInterfaz){c.campos.forEach(f=>{f.estatico=true;f.final=true;f.vis='public';});}
      clases[nombre]=c;
    }
    fuera(blank.slice(cursor),cursor);
  }
  // Resolver la jerarquía antes de validar tipos y contratos.
  const firmaMetodo=m=>`${m.nombre}(${m.params.map(p=>p.tipo).join(',')})`;
  for(const c of Object.values(clases))if(c.hereda&&c.tipo==='clase'){
    const base=tipoBase(c.hereda),p=clases[base];
    if(c.hereda.includes(','))errores.push(E(c.archivo,c.linea,'Una clase solo puede extender una clase base.'));
    else if(base==='Object')c.__padre=null;
    else if(!p&&base in EXC_PADRE)c.__padre=base;
    else if(!p)errores.push(E(c.archivo,c.linea,`No encuentro la clase base ${base}. Revisa su nombre o crea ${base}.java.`));
    else if(p.tipo==='interface')errores.push(E(c.archivo,c.linea,`${base} es una interfaz: una clase la implementa con implements, no con extends.`));
    else if(p.final)errores.push(E(c.archivo,c.linea,`${base} es final: no se puede extender.`));
    else c.__padre=base;
  }
  const ciclos=new Set();
  const resolverJerarquia=(c,ruta=[])=>{
    if(c.__resuelta)return;
    if(ruta.includes(c.nombre)){
      const ciclo=[...ruta.slice(ruta.indexOf(c.nombre)),c.nombre].join(' → ');
      if(!ciclos.has(ciclo)){ciclos.add(ciclo);errores.push(E(c.archivo,c.linea,`La herencia forma un ciclo: ${ciclo}.`));}
      return;
    }
    const p=c.__padre&&clases[c.__padre];
    if(p)resolverJerarquia(p,[...ruta,c.nombre]);
    const heredados=p?.__metodos||[],metodos=[...heredados];
    for(const mt of c.metodos){const i=metodos.findIndex(x=>firmaMetodo(x)===firmaMetodo(mt));if(i<0)metodos.push(mt);else metodos[i]=mt;}
    c.__campos=[...(p?.__campos||p?.campos||[]),...c.campos];
    c.__metodos=metodos;
    c.__interfaces=[...new Set([...(p?.__interfaces||[]),...c.implementa.map(tipoBase)])];
    c.__resuelta=true;
  };
  for(const c of Object.values(clases))resolverJerarquia(c);

  // Revisión global: tipos, contratos, final y acceso privado
  const conocido=t=>{const b=tipoBase(t);return PRIM.has(b)||CONOCIDOS.has(b)||!!clases[b];};
  const revisaTipo=(t,c,linea)=>{if(conocido(t))return;const b=tipoBase(t);
    errores.push(E(c.archivo,linea,b==='string'?'En Java es String, con S mayúscula.':b==='integer'||b==='Int'?`No encuentro el tipo ${b}. Para enteros usa int.`:`No encuentro el tipo ${b}. ¿Existe esa clase o está mal escrito?`));};
  const lineaDe=(b,idx)=>b.linea+lineaEn(b.cuerpoBlank,idx)-1;
  for(const c of Object.values(clases)){
    c.campos.forEach(f=>revisaTipo(f.tipo,c,f.linea));
    c.ctors.forEach(k=>k.params.forEach(p=>revisaTipo(p.tipo,c,k.linea)));
    c.metodos.forEach(mt=>{if(mt.ret!=='void')revisaTipo(mt.ret,c,mt.linea);mt.params.forEach(p=>revisaTipo(p.tipo,c,mt.linea));});
    if(c.final&&c.abstracta)errores.push(E(c.archivo,c.linea,'Una clase no puede ser abstract y final a la vez.'));
    const padre=c.__padre&&clases[c.__padre];
    for(const mt of c.metodos){
      const sup=padre?.__metodos?.find(x=>firmaMetodo(x)===firmaMetodo(mt)&&x.vis!=='private');
      const contratos=c.__interfaces.flatMap(n=>clases[n]?.metodos||[]);
      const contrato=contratos.find(x=>firmaMetodo(x)===firmaMetodo(mt));
      const deObject=DE_OBJECT[firmaMetodo(mt)];
      const deExcepcion=c.__padre in EXC_PADRE&&['getMessage','toString','printStackTrace'].includes(mt.nombre);
      const deInterfazJava=c.__interfaces.some(n=>!clases[n]);// Comparable<T> y otras de Java
      if(mt.override&&!sup&&!contrato&&!deObject&&!deExcepcion&&!deInterfazJava){
        if(mt.nombre==='equals')errores.push(E(c.archivo,mt.linea,`equals de Object recibe un Object: escribe public boolean equals(Object otro) y dentro comprueba con instanceof y haz el cast. Con equals(${mt.params.map(p=>p.tipo).join(', ')}) estarías sobrecargando, no redefiniendo.`));
        else errores.push(E(c.archivo,mt.linea,`${mt.nombre}() tiene @Override, pero no redefine un método heredado ni implementa uno de una interfaz.`));
      }
      if(deObject&&!sup&&!mt.estatico){
        if(mt.ret!==deObject)errores.push(E(c.archivo,mt.linea,`${mt.nombre}() viene de Object y debe devolver ${deObject}.`));
        else if(mt.vis!=='public')errores.push(E(c.archivo,mt.linea,`${mt.nombre}() viene de Object, donde es public: al redefinirlo no puede tener menos visibilidad. Escribe public ${deObject} ${firmaMetodo(mt).replace('(Object)','(Object otro)')}.`));
      }
      if(sup){
        if(sup.final)errores.push(E(c.archivo,mt.linea,`${mt.nombre}() es final en ${padre.nombre}: no se puede redefinir.`));
        if(sup.estatico!==mt.estatico)errores.push(E(c.archivo,mt.linea,`${mt.nombre}() debe conservar si es static al redefinirlo.`));
        if(sup.ret!==mt.ret)errores.push(E(c.archivo,mt.linea,`${mt.nombre}() debe devolver ${sup.ret}, como en ${padre.nombre}.`));
        const nivel={private:0,package:1,protected:2,public:3};
        if(nivel[mt.vis]<nivel[sup.vis])errores.push(E(c.archivo,mt.linea,`${mt.nombre}() no puede reducir la visibilidad heredada de ${sup.vis} a ${mt.vis}.`));
      }
    }
    // Contratos: implements, incluidos los que hereda de una clase base.
    for(const nomI of c.__interfaces){
      const base=tipoBase(nomI),I=clases[base];
      if(base==='Comparable'){
        if(!c.metodos.some(x=>x.nombre==='compareTo'&&x.params.length===1))errores.push(E(c.archivo,c.linea,`${c.nombre} implementa Comparable pero le falta el método public int compareTo(${(/<(.+)>/.exec(nomI)||[])[1]||'Object'} otro).`));
        continue;
      }
      if(!I){errores.push(E(c.archivo,c.linea,`No encuentro la interfaz ${base}. ¿Existe ${base}.java o está mal escrito?`));continue;}
      if(I.tipo!=='interface'){errores.push(E(c.archivo,c.linea,`${base} es una clase: con implements solo van interfaces. Para heredar de una clase se usa extends (Mundo 5).`));continue;}
      if(c.tipo==='interface')continue;
      for(const am of I.metodos.filter(x=>x.abstracto)){
        const impl=c.__metodos.find(x=>x.nombre===am.nombre&&x.params.length===am.params.length&&!x.abstracto);
        if(!impl){if(!c.abstracta)errores.push(E(c.archivo,c.linea,`${c.nombre} dice implements ${base} pero le falta el método public ${am.ret} ${am.nombre}(${am.params.map(p=>p.tipo+' '+p.nombre).join(', ')}).`));}
        else if(impl.vis!=='public')errores.push(E(c.archivo,impl.linea,`${am.nombre}() viene de la interfaz ${base}: debe ser public.`));
        else if(impl.ret!==am.ret)errores.push(E(c.archivo,impl.linea,`${am.nombre}() debe devolver ${am.ret}, como dice la interfaz ${base}.`));
      }
    }
    if(c.tipo==='clase'&&!c.abstracta){
      const ab=c.metodos.find(x=>x.abstracto);
      if(ab)errores.push(E(c.archivo,ab.linea,`El método ${ab.nombre}() no tiene cuerpo. Agrega { ... } con lo que hace.`));
      const heredado=c.__metodos.find(x=>x.abstracto&&!c.metodos.includes(x));
      if(heredado)errores.push(E(c.archivo,c.linea,`${c.nombre} hereda ${heredado.nombre}() sin implementarlo. Declara ${c.nombre} abstract o escribe el método.`));
    }
    // Herencia: super(...) y miembros private del padre
    if(c.tipo==='clase'){
      const padreC=c.__padre&&clases[c.__padre];
      const ctorsPadre=padreC?padreC.ctors:[];
      const ctorsC=c.ctors.length?c.ctors:[{params:[],cuerpoBlank:'{}',linea:c.linea,implicito:true}];
      for(const k of ctorsC){
        const inicio=/^\{\s*super\s*\(/.exec(k.cuerpoBlank);
        const todos=[...k.cuerpoBlank.matchAll(/(?<![\w$.])super\s*\(/g)];
        if(todos.length&&(!inicio||todos.length>1))errores.push(E(c.archivo,lineaDe(k,todos[inicio?1:0].index),'super(...) debe ser la primera instrucción del constructor, y solo puede aparecer una vez.'));
        if(!padreC)continue;
        if(inicio){
          const ini=inicio[0].length-1,fin=parentesisFinal(k.cuerpoBlank,ini);
          const nArgs=k.cuerpoBlank.slice(ini+1,fin).trim()?partirComas(k.cuerpoBlank.slice(ini+1,fin)).length:0;
          if(ctorsPadre.length?!ctorsPadre.some(x=>x.params.length===nArgs):nArgs>0)
            errores.push(E(c.archivo,lineaDe(k,ini),`${padreC.nombre} no tiene un constructor que reciba ${nArgs} argumento(s). Revisa los argumentos de super(...).`));
        }else if(ctorsPadre.length&&!ctorsPadre.some(x=>x.params.length===0)){
          const f=ctorsPadre[0];
          errores.push(E(c.archivo,k.linea,`${padreC.nombre} no tiene constructor sin parámetros: ${k.implicito?`escribe un constructor en ${c.nombre} que empiece con`:'empieza este constructor con'} super(${f.params.map(p=>p.nombre).join(', ')});`));
        }
      }
      for(const mt of c.metodos.filter(x=>!x.abstracto)){
        const r=/(?<![\w$.])super\s*\(/.exec(mt.cuerpoBlank);
        if(r)errores.push(E(c.archivo,lineaDe(mt,r.index),'super(...) solo se usa en la primera línea de un constructor. Para llamar al método del padre escribe super.metodo(...).'));
        if(padreC){const re=/(?<![\w$.])super\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g;let q;
          while((q=re.exec(mt.cuerpoBlank))){const nom=q[1],m2=padreC.__metodos.find(x=>x.nombre===nom&&x.vis!=='private');
            if(!m2)errores.push(E(c.archivo,lineaDe(mt,q.index),`${padreC.nombre} no tiene un método ${nom}() que ${c.nombre} pueda usar con super.`));
            else if(m2.abstracto)errores.push(E(c.archivo,lineaDe(mt,q.index),`${nom}() es abstracto en ${padreC.nombre}: no tiene cuerpo que llamar con super.`));}}
      }
      if(padreC){
        const propios=new Set(c.campos.map(f=>f.nombre));
        const privados=padreC.__campos.filter(f=>f.vis==='private'&&!propios.has(f.nombre));
        for(const b of [...c.ctors,...c.metodos.filter(x=>!x.abstracto)]){
          for(const f of privados){
            const re=new RegExp(`(?:(?<![\\w$.])|(?:this|super)\\s*\\.\\s*)${f.nombre}\\b(?!\\s*\\()`,'g');let q;
            const local=new RegExp(`\\b(?!(?:return|new|throw|else|case|yield)\\b)[A-Za-z_$][\\w$]*(?:\\s*<[^>]*>)?(?:\\s*\\[\\s*\\])*\\s+${f.nombre}\\s*[=;:,)]`);
            if((b.params||[]).some(x=>x.nombre===f.nombre)||local.test(b.cuerpoBlank))continue;
            const duenoF=Object.values(clases).find(x=>x.campos.includes(f));
            if((q=re.exec(b.cuerpoBlank))){errores.push(E(c.archivo,lineaDe(b,q.index),`${f.nombre} es private en ${duenoF.nombre}: ${c.nombre} lo hereda pero no puede usarlo directamente. Decláralo protected en ${duenoF.nombre} o usa su getter.`));break;}
          }
        }
      }
    }
    // final: un solo valor
    const cuerposMet=c.metodos.filter(x=>!x.abstracto);
    for(const f of c.campos.filter(f=>f.final)){
      const re=new RegExp(`(?<![\\w$.])(?:this\\s*\\.\\s*)?${f.nombre}\\s*(?:[-+*/]?=(?!=)|\\+\\+|--)|(?:\\+\\+|--)\\s*(?:this\\s*\\.\\s*)?${f.nombre}\\b`);
      for(const b of cuerposMet){const r=re.exec(b.cuerpoBlank);if(r){errores.push(E(c.archivo,lineaDe(b,r.index),`${f.nombre} es final: solo recibe valor una vez, en su declaración o en el constructor.`));break;}}
      if(!f.estatico&&f.init==null&&c.tipo==='clase'){
        const reA=new RegExp(`(?<![\\w$.])(?:this\\s*\\.\\s*)?${f.nombre}\\s*=(?!=)`);
        if(!c.ctors.length||c.ctors.some(k=>!reA.test(k.cuerpoBlank)))errores.push(E(c.archivo,f.linea,`El atributo final ${f.nombre} debe recibir su valor en el constructor.`));
      }
    }
    // new sobre interfaces o clases abstractas
    for(const b of [...c.ctors,...cuerposMet]){
      const re=/\bnew\s+([A-Z][\w$]*)\s*\(/g;let r;
      while((r=re.exec(b.cuerpoBlank))){const o=clases[r[1]];
        if(o&&o.tipo==='interface')errores.push(E(c.archivo,lineaDe(b,r.index),`No se pueden crear objetos de una interfaz: ${o.nombre} es un contrato, no un plano. Crea un objeto de una clase que lo implemente.`));
        else if(o&&o.abstracta)errores.push(E(c.archivo,lineaDe(b,r.index),`${o.nombre} es abstracta: no se pueden crear objetos de ella directamente.`));}
    }
    // Firmas repetidas: la sobrecarga exige parámetros distintos
    {
      const vistos=new Map();
      for(const mt of c.metodos){const f=firmaMetodo(mt);if(vistos.has(f)){errores.push(E(c.archivo,mt.linea,`${c.nombre} ya tiene un método ${f}. Para sobrecargar, cambia la cantidad o el tipo de los parámetros (el nombre de los parámetros no cuenta).`));}else vistos.set(f,mt);}
      const ks=new Set();
      for(const k of c.ctors){const f=k.params.map(p=>p.tipo).join(',');if(ks.has(f))errores.push(E(c.archivo,k.linea,`${c.nombre} ya tiene un constructor con parámetros (${f}).`));ks.add(f);}
    }
    // Polimorfismo: el tipo de la variable decide qué métodos se pueden llamar
    {
      const UNIVERSALES=new Set(['toString','equals','hashCode','getClass']);
      const metodosDeTipo=t=>{
        const C=clases[t];if(!C)return null;
        const nombres=new Set(),visitar=x=>{if(!x)return;for(const m of (x.__metodos||x.metodos))nombres.add(m.nombre);for(const i of (x.__interfaces||x.implementa||[]))visitar(clases[tipoBase(i)]);};
        visitar(C);return nombres;
      };
      for(const b of [...c.ctors,...c.metodos.filter(x=>!x.abstracto)]){
        const tipos=new Map(),choque=new Set();
        const anotar=(n,t)=>{t=tipoBase(t);if(tipos.has(n)&&tipos.get(n)!==t)choque.add(n);tipos.set(n,t);};
        for(const p of b.params||[])anotar(p.nombre,p.tipo);
        const reD=/(?<![\w$.])([A-Z][\w$]*)(?:\s*<[^<>]*>)?(?:\s*\[\s*\])*\s+([a-z_$][\w$]*)\s*(?=[=;:,)])/g;let q;
        while((q=reD.exec(b.cuerpoBlank)))anotar(q[2],q[1]);
        const tipoVar=n=>{if(n==='this')return c.nombre;if(choque.has(n))return null;if(tipos.has(n))return tipos.get(n);const f=(c.__campos||c.campos).find(x=>x.nombre===n);return f?tipoBase(f.tipo):null;};
        const reL=/(?<![\w$.)\]])([a-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g;
        while((q=reL.exec(b.cuerpoBlank))){
          const t=tipoVar(q[1]);
          if(t==='Object'&&!UNIVERSALES.has(q[2])){errores.push(E(c.archivo,lineaDe(b,q.index),`${q[1]} es de tipo Object, y Object solo tiene toString(), equals(), hashCode() y getClass(). Si sabes qué es en realidad, compruébalo con instanceof y haz un cast: ((Clase) ${q[1]}).${q[2]}(...)`));continue;}
          if(!t||!clases[t]||UNIVERSALES.has(q[2]))continue;
          if(esLanzable(clases,t)&&['getMessage','printStackTrace','getCause'].includes(q[2]))continue;
          const ms=metodosDeTipo(t);if(ms.has(q[2]))continue;
          const conElMetodo=Object.values(clases).filter(x=>x!==clases[t]&&metodosDeTipo(x.nombre).has(q[2])&&(x.tipo==='interface'?false:(()=>{let y=x;while(y){if(y.nombre===t||(y.__interfaces||[]).includes(t))return true;y=y.__padre&&clases[y.__padre];}return false;})()));
          const sug=conElMetodo[0];
          errores.push(E(c.archivo,lineaDe(b,q.index),sug
            ?`${q[1]} es de tipo ${t}, y ${t} no tiene ${q[2]}(). El objeto puede ser un ${sug.nombre}, pero Java solo deja llamar lo que declara el tipo de la variable. Comprueba con instanceof y usa un cast: ((${sug.nombre}) ${q[1]}).${q[2]}(...)`
            :`${q[1]} es de tipo ${t}, y ${t} no tiene un método ${q[2]}().`));
        }
      }
    }
    // Acceso a miembros private de otra clase (resolviendo el tipo del receptor cuando se puede)
    const tipoDeVar=(b,nom)=>{
      if(nom==='this')return c.nombre;
      const p=(b.params||[]).find(x=>x.nombre===nom);if(p)return tipoBase(p.tipo);
      const d=new RegExp(`\\b([A-Z][\\w$]*)(?:\\s*<[^>]*>)?\\s+${nom}\\b`).exec(b.cuerpoBlank);if(d)return d[1];
      const f=c.campos.find(x=>x.nombre===nom);if(f)return tipoBase(f.tipo);
      if(clases[nom])return nom;
      return null;
    };
    for(const o of Object.values(clases)){
      if(o===c)continue;
      const cuerpos=[...c.ctors,...cuerposMet];
      const revisar=(nombreM,esMetodo,msg)=>{
        const re=new RegExp(`([\\w$]+)\\s*\\.\\s*${nombreM}\\b(?!\\s*\\w)${esMetodo?'(?=\\s*\\()':'(?!\\s*\\()'}`,'g');
        for(const b of cuerpos){let r;re.lastIndex=0;
          while((r=re.exec(b.cuerpoBlank))){const t=tipoDeVar(b,r[1]);if(t&&t!==o.nombre)continue;
            errores.push(E(c.archivo,lineaDe(b,r.index),msg));return;}}
      };
      for(const f of o.campos.filter(f=>f.vis==='private'))revisar(f.nombre,false,`${f.nombre} es private en ${o.nombre}: solo el código dentro de ${o.nombre} puede usarlo.`);
      for(const mt of o.metodos.filter(x=>x.vis==='private'))revisar(mt.nombre,true,`${mt.nombre}() es private en ${o.nombre}.`);
    }
  }
  revisarExcepciones(clases,errores,conocido);
  // Las colecciones guardan objetos: ArrayList<int> no existe
  for(const [archivo,src] of Object.entries(files)){
    const b=blankStrings(blankComments(src));const re=/<\s*(int|double|boolean|char|long|float|short|byte)\s*>/g;let q;
    while((q=re.exec(b)))errores.push(E(archivo,lineaEn(b,q.index),`<${q[1]}> no existe: las colecciones guardan objetos, no tipos primitivos. Usa la clase envoltorio ${ENVOLTORIO[q[1]]}, por ejemplo ArrayList<${ENVOLTORIO[q[1]]}>.`));
  }
  errores.sort((a,b)=>a.archivo===b.archivo?a.linea-b.linea:a.archivo<b.archivo?-1:1);
  return {clases,errores};
}

/* Bloques try/catch/finally de un cuerpo (sobre el texto con comentarios y cadenas en blanco) */
function bloquesTry(b){
  const out=[];const re=/\btry\s*\{/g;let m;
  while((m=re.exec(b))){
    const ini=m.index+m[0].length-1,fin=llaveFinal(b,ini);if(fin<0)continue;
    const t={pos:m.index,ini,fin,catches:[],fn:null};let k=fin+1;
    for(;;){
      const r=/^\s*catch\s*\(([^()]*)\)\s*\{/.exec(b.slice(k));if(!r)break;
      const dentro=r[1].replace(/\s+/g,' ').trim(),mm=/^(?:final\s+)?([\w$.|\s]+?)\s+([A-Za-z_$][\w$]*)$/.exec(dentro);
      const abre=k+r[0].length-1,cierra=llaveFinal(b,abre);
      t.catches.push({tipos:mm?mm[1].split('|').map(x=>x.trim()).filter(Boolean):[],nombre:mm?mm[2]:null,pos:k+r[0].search(/catch/),abre,cierra});
      if(cierra<0)break;k=cierra+1;
    }
    const f=/^\s*finally\s*\{/.exec(b.slice(k));
    if(f){const abre=k+f[0].length-1;t.fn={pos:k+f[0].search(/finally/),abre,cierra:llaveFinal(b,abre)};}
    out.push(t);
  }
  return out;
}
/* Reglas de Java para excepciones: catch bien formados y en orden, throw solo de excepciones,
   y las excepciones comprobadas (checked) se atrapan o se declaran con throws */
function revisarExcepciones(clases,errores,conocido){
  const lanzadores=new Map();// nombre de método → [{clase,m}] que declaran excepciones comprobadas
  for(const c of Object.values(clases))for(const m of [...c.metodos,...c.ctors.map(k=>({...k,nombre:'<init>'+c.nombre}))]){
    const ch=(m.lanza||[]).filter(t=>esComprobada(clases,tipoBase(t)));
    if(ch.length){const k=m.nombre;if(!lanzadores.has(k))lanzadores.set(k,[]);lanzadores.get(k).push({clase:c.nombre,m,ch});}
  }
  const esDe=(t,base)=>{let x=clases[t],k=0;while(x&&k++<40){if(x.nombre===base||(x.__interfaces||[]).includes(base))return true;x=x.__padre&&clases[x.__padre];}return false;};
  for(const c of Object.values(clases)){
    const lineaDe=(b,idx)=>b.linea+lineaEn(b.cuerpoBlank,idx)-1;
    for(const m of [...c.metodos,...c.ctors])for(const t of m.lanza||[]){
      const b=tipoBase(t);
      if(!conocido(b))errores.push(E(c.archivo,m.linea,`No encuentro la excepción ${b} de throws. ¿Existe esa clase o está mal escrita?`));
      else if(!esLanzable(clases,b))errores.push(E(c.archivo,m.linea,`${b} no es una excepción: throws solo admite clases que extienden Exception.`));
    }
    for(const b of [...c.ctors,...c.metodos.filter(x=>!x.abstracto)]){
      const B=b.cuerpoBlank;if(!B)continue;
      const nombreB=b.nombre?`${b.nombre}()`:`el constructor de ${c.nombre}`;
      const trys=bloquesTry(B);
      const nCatch=(B.match(/\bcatch\s*\(/g)||[]).length,nCatchOk=trys.reduce((s,t)=>s+t.catches.length,0);
      if(nCatch>nCatchOk){const r=/\bcatch\s*\(/.exec(B);errores.push(E(c.archivo,lineaDe(b,r.index),'Este catch no va pegado a un try { ... }: cada catch va justo después del bloque try o de otro catch.'));}
      for(const t of trys){
        if(!t.catches.length&&!t.fn)errores.push(E(c.archivo,lineaDe(b,t.pos),'Un try necesita al menos un catch (...) { ... } o un finally { ... } después.'));
        t.catches.forEach((ca,j)=>{
          if(!ca.nombre||!ca.tipos.length){errores.push(E(c.archivo,lineaDe(b,ca.pos),'El catch necesita el tipo de la excepción y un nombre, por ejemplo: catch (IllegalArgumentException e)'));return;}
          for(const tp of ca.tipos){
            if(!conocido(tp))errores.push(E(c.archivo,lineaDe(b,ca.pos),`No encuentro la excepción ${tp}. ¿Existe esa clase o está mal escrita?`));
            else if(!esLanzable(clases,tp))errores.push(E(c.archivo,lineaDe(b,ca.pos),`${tp} no es una excepción: catch solo atrapa clases que extienden Exception.`));
            else for(const prev of t.catches.slice(0,j))for(const pt of prev.tipos)if(esSubtipoExc(clases,tp,pt)){
              errores.push(E(c.archivo,lineaDe(b,ca.pos),`${tp} ya la atrapa el catch (${pt}) de arriba, así que este nunca se usaría. Pon primero los catch más específicos y al final los más generales.`));}
          }
        });
      }
      // ¿Una excepción comprobada en la posición p queda atrapada o declarada?
      const manejada=(p,T)=>trys.some(t=>t.ini<p&&p<t.fin&&t.catches.some(ca=>ca.tipos.some(x=>esSubtipoExc(clases,T,x))))||(b.lanza||[]).some(x=>esSubtipoExc(clases,T,tipoBase(x)));
      const reT=/\bthrow\s+new\s+([A-Za-z_$][\w$]*)\s*\(/g;let q;
      while((q=reT.exec(B))){
        const T=q[1];
        if(!conocido(T))continue;
        if(!esLanzable(clases,T)){errores.push(E(c.archivo,lineaDe(b,q.index),`Con throw solo se lanzan excepciones: ${T} no extiende Exception.`));continue;}
        if(esComprobada(clases,T)&&!manejada(q.index,T))errores.push(E(c.archivo,lineaDe(b,q.index),`${T} es una excepción comprobada (checked): atrápala con try/catch o declara «throws ${T}» en ${nombreB}.`));
      }
      if(/\bthrow\s*;/.test(B)){const r=/\bthrow\s*;/.exec(B);errores.push(E(c.archivo,lineaDe(b,r.index),'throw necesita una excepción: throw new IllegalArgumentException("motivo");'));}
      if(!lanzadores.size)continue;
      // Llamadas a métodos (y constructores) que declaran excepciones comprobadas
      const tipos=new Map();
      for(const p of b.params||[])tipos.set(p.nombre,tipoBase(p.tipo));
      for(const d of B.matchAll(/(?<![\w$.])([A-Z][\w$]*)(?:\s*<[^<>]*>)?\s+([a-z_$][\w$]*)\s*(?=[=;:,)])/g))tipos.set(d[2],d[1]);
      const tipoVar=n=>n==='this'?c.nombre:tipos.get(n)||tipoBase((c.__campos||c.campos).find(f=>f.nombre===n)?.tipo||'')||null;
      const nArgs=i=>{const a=B.indexOf('(',i),z=parentesisFinal(B,a);return B.slice(a+1,z).trim()?partirComas(B.slice(a+1,z)).length:0;};
      const reL=/(?<![\w$])(?:(new)\s+([A-Z][\w$]*)|(?:([A-Za-z_$][\w$]*)\s*\.\s*)?([a-z_$][\w$]*))\s*\(/g;
      while((q=reL.exec(B))){
        if(!q[1]&&q[3]==null&&/[.]\s*$/.test(B.slice(Math.max(0,q.index-3),q.index)))continue;
        const nombre=q[1]?'<init>'+q[2]:q[4];
        if(!q[1]&&PALABRAS.has(nombre))continue;
        let cands=lanzadores.get(nombre);if(!cands)continue;
        const n=nArgs(q.index);
        cands=cands.filter(x=>x.m.params.length===n);
        if(!q[1]){
          const rec=q[3];
          if(rec==null)cands=cands.filter(x=>esDe(c.nombre,x.clase));
          else if(clases[rec]&&!tipos.has(rec))cands=cands.filter(x=>esDe(rec,x.clase));
          else{const t=tipoVar(rec);if(t&&clases[t])cands=cands.filter(x=>esDe(t,x.clase)||esDe(x.clase,t));else if(cands.length>1)continue;}
        }
        const x=cands[0];if(!x)continue;
        const falta=x.ch.map(tipoBase).find(T=>!manejada(q.index,T));
        if(falta)errores.push(E(c.archivo,lineaDe(b,q.index),`${q[1]?`El constructor de ${q[2]}`:`${nombre}()`} puede lanzar ${falta} (lo declara con throws). Llámalo dentro de un try/catch que la atrape, o declara «throws ${falta}» en ${nombreB}.`));
      }
    }
  }
}

function miembros(c,clean,blank,ini,fin,archivo,L,errores){
  let i=ini;
  while(i<fin){
    while(i<fin&&/\s/.test(blank[i]))i++;
    if(i>=fin)break;
    let j=i,dp=0;
    while(j<fin){const ch=blank[j];if(ch==='(')dp++;else if(ch===')')dp--;else if(dp===0&&(ch===';'||ch==='{'||ch==='}'))break;j++;}
    if(j>=fin){errores.push(E(archivo,L(i),'Parece que falta ; al final de esta línea.'));break;}
    const crudo=blank.slice(i,j);
    const sinAnot=t=>t.replace(/^(?:\s*@[A-Za-z_$][\w$]*(?:\([^)]*\))?)+/,'');
    const hb=sinAnot(crudo.replace(/\s+/g,' ').trim()).trim(),hc=sinAnot(clean.slice(i,j).replace(/\s+/g,' ').trim()).trim();
    const linea=L(i);
    // Atributo con inicializador de arreglo: int[] medidas = {4, 8};
    if(blank[j]==='{'&&/=\s*$/.test(blank.slice(i,j))){
      const cierre=llaveFinal(blank,j);let k=cierre+1;while(k<fin&&/\s/.test(blank[k]))k++;
      if(cierre>0&&blank[k]===';'){const crudo2=blank.slice(i,k),hc2=sinAnot(clean.slice(i,k).replace(/\s+/g,' ').trim()).trim();campo(c,hc2,crudo2,linea,errores);i=k+1;continue;}
    }
    if(blank[j]===';'){campo(c,hc,crudo,linea,errores);i=j+1;}
    else if(blank[j]==='{'){const close=llaveFinal(blank,j);metodo(c,hb,crudo,clean.slice(j,close+1),blank.slice(j,close+1),L(j),linea,errores);i=close+1;}
    else{errores.push(E(archivo,L(j),'Sobra una llave } en esta línea.'));i=j+1;}
  }
}
function campo(c,texto,crudo,linea,errores){
  const A=c.archivo;
  const sig=/^((?:(?:public|private|protected|static|final|abstract|default)\s+)*)([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+([A-Za-z_$][\w$]*)\s*\(([^()]*)\)(?:\s*throws\s+([\w\s,.]+))?$/.exec(texto);
  if(sig&&!PALABRAS.has(sig[2])){
    if(c.tipo==='interface'||/\babstract\b/.test(sig[1])){
      const params=[];
      for(const p of partirComas(sig[4])){const m=/^(?:final\s+)?(\S+(?:\s*<[^>]*>)?)\s+([A-Za-z_$][\w$]*)$/.exec(p);if(!m){errores.push(E(A,linea,`El parámetro «${p}» necesita tipo y nombre.`));return;}params.push({tipo:m[1].replace(/\s+/g,''),nombre:m[2]});}
      c.metodos.push({nombre:sig[3],ret:sig[2].replace(/\s+/g,''),params,vis:c.tipo==='interface'?'public':visDe(sig[1]),abstracto:true,estatico:false,linea,cuerpo:'',cuerpoBlank:'',lanza:sig[5]?partirComas(sig[5]).map(x=>x.trim()):[]});
      return;
    }
    errores.push(E(A,linea,`Al método ${sig[3]}() le falta el cuerpo: escribe { ... } en lugar de ;`));return;
  }
  if(/^[\w.]+\s*(?:[-+*/]?=|\+\+|--)/.test(texto)&&!/^[\w.]+\s+[\w]/.test(texto)){errores.push(E(A,linea,'Esta instrucción debe ir dentro de un método o del constructor, no suelta en la clase.'));return;}
  if(/^[\w.]+\s*\(.*\)$/.test(texto)){errores.push(E(A,linea,'Esta llamada debe ir dentro de un método (por ejemplo, dentro de main).'));return;}
  const r=/^((?:(?:public|private|protected|static|final)\s+)*)([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+([\s\S]+)$/.exec(texto);
  if(!r){errores.push(E(A,linea,/^\w+$/.test(texto)?'A este atributo le falta el tipo o el nombre, por ejemplo: int energia;':'No entiendo esta declaración de atributo.'));return;}
  if(PALABRAS.has(r[2])){errores.push(E(A,linea,'Esta instrucción debe ir dentro de un método.'));return;}
  const tipo=r[2].replace(/\s+/g,'');
  for(const d of partirComas(r[3])){
    const m=/^([A-Za-z_$][\w$]*)\s*(?:=\s*([\s\S]+))?$/.exec(d);
    if(!m){errores.push(E(A,linea,`No entiendo el atributo «${d}».`));continue;}
    c.campos.push({nombre:m[1],tipo,vis:visDe(r[1]),estatico:/\bstatic\b/.test(r[1]),final:/\bfinal\b/.test(r[1]),init:m[2]??null,linea,dueno:c.nombre});
  }
}
function metodo(c,h,crudo,cuerpo,cuerpoBlank,lineaCuerpo,linea,errores){
  const A=c.archivo;
  const r=/^((?:(?:public|private|protected|static|final|abstract|synchronized|default)\s+)*)(?:([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+)?([A-Za-z_$][\w$]*)\s*\(([^()]*)\)(?:\s*throws\s+([\w\s,.]+))?$/.exec(h);
  if(!r){
    const primera=crudo.split('\n').find(x=>x.trim());
    if(crudo.trim().includes('\n')&&primera&&!/[({]\s*$/.test(primera)&&!/\(/.test(primera))errores.push(E(A,linea,'Parece que falta ; al final de esta línea.'));
    else if(/^(if|for|while|switch)\b/.test(h))errores.push(E(A,linea,'Las instrucciones if, for y while van dentro de un método.'));
    else errores.push(E(A,linea,'No entiendo esta declaración. Un método se escribe así: public void nombre() { ... }'));
    return;
  }
  const mods=r[1]||'',tipo=r[2]?r[2].replace(/\s+/g,''):null,nombre=r[3];
  const params=[];
  for(const p of partirComas(r[4])){
    const m=/^(?:final\s+)?([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*(?:\.\.\.)?)\s+([A-Za-z_$][\w$]*)$/.exec(p);
    if(!m){errores.push(E(A,linea,`El parámetro «${p}» necesita tipo y nombre, por ejemplo: String nombre`));return;}
    params.push({tipo:m[1].replace(/\s+/g,''),nombre:m[2]});
  }
  lintCuerpo(cuerpoBlank,lineaCuerpo,A,errores);
  const base={params,vis:c.tipo==='interface'?'public':visDe(mods),cuerpo,cuerpoBlank,linea,lanza:r[5]?partirComas(r[5]).map(x=>x.trim()):[]};
  if(!tipo){
    if(nombre===c.nombre)c.ctors.push(base);
    else errores.push(E(A,linea,`El método ${nombre} necesita un tipo de retorno. Si no devuelve nada, usa void: public void ${nombre}()`));
    return;
  }
  if(nombre===c.nombre){errores.push(E(A,linea,`¿Querías un constructor? Los constructores no llevan tipo de retorno: quita «${tipo}».`));return;}
  c.metodos.push({...base,nombre,ret:tipo,estatico:/\bstatic\b/.test(mods),final:/\bfinal\b/.test(mods),override:/@Override\b/.test(crudo)});
}

/* ---------- Traducción a JavaScript ---------- */
const RE_DECL=/(^|[;{}(]\s*)(?:final\s+)?((?:int|double|float|long|short|byte|boolean|char|String|var|[A-Z][\w$]*)(?:\s*<[^;=(){}]*>)?(?:\s*\[\s*\])*)\s+([A-Za-z_$][\w$]*)(?=\s*(?:=|;|:|,))/g;
function instrumentarBucles(code){
  let out='',i=0,m;const re=/\b(for|while)\s*\(/g;
  while((m=re.exec(code))){
    const open=m.index+m[0].length-1;let d=0,k=open;
    for(;k<code.length;k++){if(code[k]==='(')d++;else if(code[k]===')'){d--;if(d===0)break;}}
    const inner=code.slice(open+1,k);let nuevo;
    if(m[1]==='while')nuevo=`(__rt.tick(), (${inner}))`;
    else if(/\bof\b/.test(inner))nuevo=`(${inner})`;
    else{const p=inner.split(';');if(p.length!==3)nuevo=`(${inner})`;else{p[1]=` (__rt.tick(), (${p[1].trim()||'true'}))`;nuevo='('+p.join(';')+')';}}
    out+=code.slice(i,open)+nuevo;i=k+1;re.lastIndex=k+1;
  }
  return out+code.slice(i);
}
/* En Java int / int es división entera: envuelve inicializaciones y retornos enteros */
function envolverEnteros(code,enteros,retEntero){
  const finExpr=(s,i)=>{let d=0;for(;i<s.length;i++){const ch=s[i];if('([{'.includes(ch))d++;else if(')]}'.includes(ch)){if(!d)return i;d--;}else if((ch===';'||ch===',')&&!d)return i;}return i;};
  let out='',i=0;const re=/\blet\s+([A-Za-z_$][\w$]*)\s*=(?!=)|\breturn\b(?=\s*[^;\s])/g;let m;
  while((m=re.exec(code))){
    const esRet=m[0].startsWith('return');
    if(esRet?!retEntero:!enteros.has(m[1]))continue;
    const ini=m.index+m[0].length,fin=finExpr(code,ini);
    const expr=code.slice(ini,fin);
    if(!/\//.test(expr)){continue;}
    out+=code.slice(i,ini)+` __rt.entero(${expr})`;i=fin;re.lastIndex=fin;
  }
  return out+code.slice(i);
}
/* Arreglos: new T[n], new T[]{...} y T[] x = {...}  →  __rt.arreglo("T", valores, n) */
const TIPO_ARR='(int|double|float|long|short|byte|boolean|char|String|[A-Z][\\w$]*)';
function traducirArreglos(code){
  const cierra=(t,i)=>{let d=0;for(let j=i;j<t.length;j++){if(t[j]==='{')d++;else if(t[j]==='}'&&--d===0)return j;}return -1;};
  const conLlaves=(re,arma)=>{let m;while((m=re.exec(code))){const ini=m.index+m[0].length-1,fin=cierra(code,ini);if(fin<0)break;code=code.slice(0,m.index)+arma(m,code.slice(ini+1,fin))+code.slice(fin+1);re.lastIndex=0;}};
  conLlaves(new RegExp(`\\bnew\\s+${TIPO_ARR}\\s*\\[\\s*\\]\\s*\\{`,'g'),(m,dentro)=>`__rt.arreglo(${JSON.stringify(m[1])}, [${dentro}])`);
  conLlaves(new RegExp(`(\\b${TIPO_ARR}\\s*\\[\\s*\\]\\s+[A-Za-z_$][\\w$]*\\s*=\\s*)\\{`,'g'),(m,dentro)=>`${m[1]}__rt.arreglo(${JSON.stringify(m[2])}, [${dentro}])`);
  return code.replace(new RegExp(`\\bnew\\s+${TIPO_ARR}\\s*\\[([^\\[\\]]+)\\](?!\\s*\\[)`,'g'),(m,t,n)=>`__rt.arreglo(${JSON.stringify(t)}, null, ${n})`);
}
/* throw x;  →  throw __rt.lanzado(x);  (registra el evento para la escena) */
function traducirThrow(code){
  let out='',i=0,m;const re=/\bthrow\s+/g;
  while((m=re.exec(code))){
    const ini=m.index+m[0].length;let d=0,k=ini;
    for(;k<code.length;k++){const ch=code[k];if('([{'.includes(ch))d++;else if(')]}'.includes(ch))d--;else if(ch===';'&&d<=0)break;}
    out+=code.slice(i,m.index)+`throw __rt.lanzado(${code.slice(ini,k)})`;i=k;re.lastIndex=k;
  }
  return out+code.slice(i);
}
/* try { } catch (A | B e) { } catch (C e) { } finally { }  →  un solo catch de JavaScript que elige
   el bloque según la jerarquía de excepciones; lo que no se atrapa se vuelve a lanzar */
let __nTry=0;
function traducirTry(code){
  for(;;){
    const ms=[...code.matchAll(/\btry\s*\{/g)];if(!ms.length)return code;
    const m=ms[ms.length-1],ini=m.index+m[0].length-1,fin=llaveFinal(code,ini);if(fin<0)return code;
    const id=++__nTry,partes=[];let k=fin+1,r;
    while((r=/^\s*catch\s*\(([^()]*)\)\s*\{/.exec(code.slice(k)))){
      const dentro=r[1].replace(/\s+/g,' ').trim(),mm=/^(?:final\s+)?([\w$.|\s]+?)\s+([A-Za-z_$][\w$]*)$/.exec(dentro);
      const abre=k+r[0].length-1,cierra=llaveFinal(code,abre);if(!mm||cierra<0)break;
      partes.push({tipos:mm[1].split('|').map(x=>x.trim()),nombre:mm[2],cuerpo:code.slice(abre+1,cierra)});k=cierra+1;
    }
    let fn=null;const f=/^\s*finally\s*\{/.exec(code.slice(k));
    if(f){const abre=k+f[0].length-1,cierra=llaveFinal(code,abre);fn=code.slice(abre+1,cierra);k=cierra+1;}
    let js=`__TRY__{${code.slice(ini+1,fin)}}`;
    if(partes.length){
      js+=` catch(__x${id}){ const __e${id}=__rt.excepcion(__x${id});\n`;
      partes.forEach((p,j)=>{js+=`${j?'else ':''}if(__e${id}&&__rt.atrapa(__e${id},${JSON.stringify(p.tipos)})){ __rt.atrapado(__e${id},${JSON.stringify(p.tipos.join(' | '))}); ${p.tipos[0]} ${p.nombre} = __e${id};${p.cuerpo}}\n`;});
      js+=`else throw __x${id};\n}`;
    }
    if(fn!=null)js+=` finally { __rt.finalmente();${fn}}`;
    code=code.slice(0,m.index)+js+code.slice(k);
  }
}
function traducir(code,c,locales,self,retTipo){
  const lits=[];
  code=code.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,m=>{lits.push(m);return `__S${lits.length-1}__`;});
  code=traducirArreglos(code);
  code=code.replace(/\binstanceof\s+(Object|String|Integer|Double|Number|Boolean|Character|Long|Float)\b/g,'instanceof __rt.J.$1');
  code=code.replace(/\bString\s*\.\s*valueOf\s*\(/g,'__rt.valorTexto(');
  if(/\bthrow\b/.test(code))code=traducirThrow(code);
  if(/\btry\b/.test(code))code=traducirTry(code).replace(/__TRY__/g,'try');
  const loc=new Set(locales);const enteros=new Set();
  code=code.replace(RE_DECL,(m,pre,tipo,nombre)=>{loc.add(nombre);if(INTS.has(tipo.trim()))enteros.add(nombre);return `${pre}let ${nombre}`;});
  code=envolverEnteros(code,enteros,retTipo&&INTS.has(retTipo));
  code=code.replace(/for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*:/g,'for (let $1 of');
  code=instrumentarBucles(code);
  code=code.replace(/\bSystem\s*\.\s*out\s*\.\s*print(?:ln|f)?\s*\(/g,'__rt.print(');
  code=code.replace(/\.length\s*\(\s*\)/g,'.length');
  code=code.replace(/\(\s*(?:int|long)\s*\)\s*/g,'~~').replace(/\(\s*(?:double|float)\s*\)\s*/g,'+');
  code=code.replace(/\(\s*([A-Z][\w$]*)\s*\)\s*([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*(?:\s*\([^()]*\))?)*(?:\s*\([^()]*\))?)/g,(m,tipo,expr)=>/^(?:String|Object|Integer|Double|Boolean|Character|Long)$/.test(tipo)?expr:`__rt.cast(${JSON.stringify(tipo)},${expr})`);
  code=code.replace(/\(\s*[A-Z][\w$]*(?:\s*<[^<>()]*>)?\s*\)\s*(?=[\w$(])/g,'');
  code=code.replace(/\bnew\s+([A-Za-z_$][\w$]*)\s*<[^>]*>/g,'new $1');
  const padre=c.__padre;
  code=code.replace(/(?<![\w$.])super\s*\.\s*([A-Za-z_$][\w$]*)\s*\(\s*(\)?)/g,(m,nom,cierra)=>`${padre||'Object'}.prototype.${nom}.call(this${cierra?')':', '}`);
  code=code.replace(/(?<![\w$.])super\s*\.\s*/g,'this.');
  code=code.replace(/(?<![\w$.])super\s*\(\s*(\)?)/g,(m,cierra)=>padre?`${padre}.__ctor(this${cierra?')':', '}`:(cierra?'void 0':'(void 0, '));
  code=code.replace(/\bthis\b/g,self);
  const camposVis=(c.__campos||c.campos).filter(f=>c.campos.includes(f)||f.vis!=='private');
  for(const f of camposVis){
    if(loc.has(f.nombre))continue;
    const duenoF=f.dueno||c.nombre;
    code=code.replace(new RegExp(`(?<![\\w$.])${f.nombre}\\b(?!\\s*\\()`,'g'),`${f.estatico?duenoF:self}.${f.nombre}`);
  }
  for(const [f,dueno] of c.__constantes||[]){
    if(loc.has(f))continue;
    code=code.replace(new RegExp(`(?<![\\w$.])${f}\\b(?!\\s*\\()`,'g'),`${dueno}.${f}`);
  }
  code=code.replace(/(?<![\w$.])getClass\s*\(/g,`${self}.getClass(`);
  const metodosVis=(c.__metodos||c.metodos).filter(x=>c.metodos.includes(x)||x.vis!=='private');
  for(const mn of new Set(metodosVis.map(x=>x.nombre))){
    const est=metodosVis.find(x=>x.nombre===mn).estatico;
    code=code.replace(new RegExp(`(?<![\\w$.])${mn}\\s*\\(`,'g'),`${est?c.nombre:self}.${mn}(`);
  }
  return code.replace(/__S(\d+)__/g,(m,k)=>lits[+k]);
}
function parentesisFinal(t,i){let d=0;for(let j=i;j<t.length;j++){if(t[j]==='(')d++;else if(t[j]===')'&&--d===0)return j;}return t.length-1;}
/* Agrupa versiones sobrecargadas por cantidad de parámetros; si hay varias con la misma cantidad,
   elige la más específica cuyos tipos coinciden con los argumentos. */
function porAridad(lista,gen,que,modelo){
  const grupos=new Map();
  for(const x of lista){const n=x.params.length;if(!grupos.has(n))grupos.set(n,[]);grupos.get(n).push(x);}
  const prof=t=>{let c=modelo.clases[tipoBase(t)],d=0;while(c&&c.__padre){d++;c=modelo.clases[c.__padre];}return d;};
  const peso=t=>{const b=tipoBase(t);if(INTS.has(b)||b==='char')return 0;if(b==='double'||b==='float')return 2;if(b==='Object')return 9;if(modelo.clases[b])return 5-prof(t);return 1;};
  let s='';
  for(const [n,xs] of grupos){
    if(xs.length===1){s+=`case ${n}: { ${gen(xs[0])} }\n`;continue;}
    const ord=[...xs].sort((a,b)=>a.params.reduce((t,p)=>t+peso(p.tipo),0)-b.params.reduce((t,p)=>t+peso(p.tipo),0));
    s+=`case ${n}: {\n`;
    for(const x of ord)s+=`if(__rt.coincide(__a,${JSON.stringify(x.params.map(p=>p.tipo))})){ ${gen(x)} }\n`;
    s+=`throw new __rt.JavaError(${JSON.stringify(`No hay una versión de ${que} para argumentos de esos tipos.`)});\n}\n`;
  }
  return s;
}
function defVal(t){const b=tipoBase(t);if(INTS.has(b)||b==='double'||b==='float')return '0';if(b==='boolean')return 'false';if(b==='char')return "'\\0'";return 'null';}
function genClase(c,modelo){
  const campos=c.__campos||c.campos,metodos=c.__metodos||c.metodos;
  const inst=campos.filter(f=>!f.estatico),est=c.campos.filter(f=>f.estatico);
  const declaracion=m=>Object.values(modelo.clases).find(x=>x.metodos.includes(m))||c;
  c.__constantes=[];
  for(const i of c.implementa){const I=modelo.clases[tipoBase(i)];if(I)for(const f of I.campos)c.__constantes.push([f.nombre,I.nombre]);}
  if(c.tipo==='interface'){
    let s=`class ${c.nombre} {\nstatic [Symbol.hasInstance](o){ return __rt.implementa(o,${JSON.stringify(c.nombre)}); }\n`;
    for(const f of est)s+=`static ${f.nombre} = ${f.init!=null?traducir(f.init,c,[],c.nombre):defVal(f.tipo)};\n`;
    return s+'}\n';
  }
  let s=`class ${c.nombre} {\nstatic [Symbol.hasInstance](o){ return __rt.esInstancia(o,${JSON.stringify(c.nombre)}); }\n`;
  for(const f of est)s+=`static ${f.nombre} = ${f.init!=null?traducir(/\[\]$/.test(f.tipo)&&/^\s*\{/.test(f.init)?`new ${tipoBase(f.tipo)}[]${f.init}`:f.init,c,[],c.nombre):defVal(f.tipo)};\n`;
  // Orden de Java: valores por defecto, constructor del padre (super), inicializadores propios y cuerpo del constructor.
  const lanzable=esLanzable(modelo.clases,c.nombre);
  s+=`constructor(...__a){\n${lanzable?'this.__msg=null;':''}${inst.map(f=>`this.${f.nombre}=${defVal(f.tipo)};`).join('')}\nconst __self=__rt.track(this,${JSON.stringify(c.nombre)});\n${c.nombre}.__ctor(__self,...__a);\nreturn __self;\n}\n`;
  const ctors=c.ctors.length?c.ctors:[{params:[],cuerpo:'{}',cuerpoBlank:'{}'}];
  const iniDe=f=>(/\[\]$/.test(f.tipo)&&/^\s*\{/.test(f.init)?`new ${tipoBase(f.tipo)}[]${f.init}`:f.init);
  const inits=c.campos.filter(f=>!f.estatico&&f.init!=null).map(f=>`__self.${f.nombre}=(${traducir(iniDe(f),c,[],'__self')});\n`).join('');
  s+='static __ctor(__self,...__a){ switch(__a.length){\n';
  const genCtor=k=>{
    const ns=k.params.map(p=>p.nombre);
    let llamada=c.__padre?`${c.__padre}.__ctor(__self);\n`:'',cuerpo=k.cuerpo;
    const sup=/^\{\s*super\s*\(/.exec(k.cuerpoBlank||'');
    if(sup){
      const ini=sup[0].length-1,fin=parentesisFinal(k.cuerpoBlank,ini);
      let corte=fin+1;while(corte<k.cuerpoBlank.length&&/\s/.test(k.cuerpoBlank[corte]))corte++;if(k.cuerpoBlank[corte]===';')corte++;
      llamada=traducir(k.cuerpo.slice(1,corte),c,ns,'__self')+'\n';
      cuerpo='{'+k.cuerpo.slice(corte);
    }
    return `let [${ns.join(',')}]=__a;\n${llamada}${inits}${traducir(cuerpo,c,ns,'__self')}\nreturn;`;
  };
  s+=porAridad(ctors,genCtor,`el constructor ${c.nombre}`,modelo);
  s+=`}\nthrow new __rt.JavaError(${JSON.stringify(`No existe un constructor ${c.nombre}(...) que reciba `)}+__a.length+' argumento(s).');\n}\n`;
  const grupos=new Map();for(const m of metodos.filter(x=>!x.abstracto)){if(!grupos.has(m.nombre))grupos.set(m.nombre,[]);grupos.get(m.nombre).push(m);}
  for(const [nm,g] of grupos){
    const st=g[0].estatico;
    s+=`${st?'static ':''}${nm}(...__a){ switch(__a.length){\n`;
    s+=porAridad(g,m=>{const ns=m.params.map(p=>p.nombre),d=declaracion(m);return `let [${ns.join(',')}]=__a;\n${traducir(m.cuerpo,d,ns,st?d.nombre:'this',m.ret)}\nreturn;`;},`el método ${nm}`,modelo);
    s+=`}\nthrow new __rt.JavaError(${JSON.stringify(`El método ${nm} no recibe `)}+__a.length+' argumento(s).'); }\n`;
  }
  if(lanzable){
    if(!grupos.has('getMessage'))s+='getMessage(){ return this.__msg; }\n';
    if(!grupos.has('printStackTrace'))s+='printStackTrace(){ __rt.print(String(this)); }\n';
    if(!grupos.has('toString'))s+=`toString(){ const m=this.getMessage(); return ${JSON.stringify(c.nombre)}+(m!=null?': '+m:''); }\n`;
  }
  else if(!grupos.has('toString'))s+='toString(){ return __rt.ref(this); }\n';
  // Lo que toda clase hereda de Object: equals compara identidad y hashCode sale de la identidad
  if(!grupos.has('equals'))s+='equals(o){ return this===o; }\n';
  if(!grupos.has('hashCode'))s+='hashCode(){ return __rt.hash(this); }\n';
  s+=`getClass(){ return ${c.nombre}; }\nstatic getSimpleName(){ return ${JSON.stringify(c.nombre)}; }\nstatic getName(){ return ${JSON.stringify(c.nombre)}; }\n`;
  return s+'}\n';
}
const PRELUDIO=`class Throwable{constructor(m=null){this.__exc=new.target.name;this.__msg=m==null?null:String(m);} getMessage(){return this.__msg;} toString(){const m=this.getMessage();return this.__exc+(m!=null?': '+m:'');} printStackTrace(){__rt.print(String(this));} getClass(){return this.constructor;} static __ctor(s,m=null){s.__msg=m==null?null:String(m);} static getSimpleName(){return this.name;} static getName(){return this.name;} static [Symbol.hasInstance](o){return __rt.esExcepcion(o,this.name);}}
${Object.entries(EXC_PADRE).filter(([,p])=>p).map(([n,p])=>`class ${n} extends ${p}{}`).join('\n')}
__rt.EXC={${Object.keys(EXC_PADRE).join(',')}};
class ArrayList extends Array{constructor(){super();} add(x){__rt.tick();this.push(x);__rt.agregado(this,x);return true;} get(i){if(i<0||i>=this.length)throw new __rt.JavaError('IndexOutOfBoundsException: la posición '+i+' no existe; la lista tiene '+this.length+' elemento(s).');return this[i];} size(){return this.length;} isEmpty(){return this.length===0;} remove(i){const x=this.splice(typeof i==='number'?i:this.indexOf(i),1)[0];__rt.agregado(this,null);return x;} contains(x){return this.includes(x);} clear(){this.length=0;}}
ArrayList.prototype.toString=function(){return '['+Array.from(this,x=>__rt.fmt(x)).join(', ')+']';};
ArrayList.prototype.indexOf=function(x){for(let i=0;i<this.length;i++)if(__rt.iguales(this[i],x))return i;return -1;};
ArrayList.prototype.contains=function(x){return this.indexOf(x)>=0;};
ArrayList.prototype.equals=function(o){return Array.isArray(o)&&o.length===this.length&&this.every((x,i)=>__rt.iguales(x,o[i]));};
ArrayList.prototype.hashCode=function(){let h=1;for(const x of this)h=(31*h+(x==null?0:__rt.hashDe(x)))|0;return h;};
ArrayList.prototype.getClass=function(){return ArrayList;};
ArrayList.getSimpleName=()=>'ArrayList';ArrayList.getName=()=>'java.util.ArrayList';
const List=ArrayList;
const Arrays={toString(a){return a==null?'null':'['+Array.from(a,x=>__rt.fmt(x)).join(', ')+']';},equals(a,b){if(a===b)return true;if(a==null||b==null||a.length!==b.length)return false;return a.every((x,i)=>__rt.iguales(x,b[i]));},sort(a){a.sort((x,y)=>(typeof x==='string'||typeof x==='number')?(x<y?-1:x>y?1:0):x.compareTo(y));},fill(a,v){a.fill(v);}};
const Double={parseDouble:s=>{const t=s==null?'':String(s).trim();if(!/^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$/.test(t))throw __rt.lanzado(new NumberFormatException('For input string: "'+s+'"'));return parseFloat(t);},valueOf:x=>typeof x==='string'?Double.parseDouble(x):x,compare:(a,b)=>a<b?-1:a>b?1:0,MAX_VALUE:Number.MAX_VALUE,MIN_VALUE:Number.MIN_VALUE};
const Collections={sort(l,c){l.sort((a,b)=>c?c.compare(a,b):a.compareTo(b));__rt.agregado(l,null);}};
const Integer={parseInt:s=>{const t=s==null?'':String(s).trim();if(!/^[+-]?\\d+$/.test(t))throw __rt.lanzado(new NumberFormatException('For input string: "'+s+'"'));return parseInt(t,10);},compare:(a,b)=>a<b?-1:a>b?1:0,valueOf:x=>typeof x==='string'?Integer.parseInt(x):x,toString:x=>String(x),MAX_VALUE:2147483647,MIN_VALUE:-2147483648};\n`;
for(const [k,f] of Object.entries({
  equals(o){return this.valueOf()===o;},
  equalsIgnoreCase(o){return o!=null&&this.toLowerCase()===String(o).toLowerCase();},
  isEmpty(){return this.length===0;},
  contains(o){return this.includes(o);},
  compareTo(o){const a=this.valueOf();return a<o?-1:a>o?1:0;},
  hashCode(){let h=0;for(const ch of this.valueOf())h=(31*h+ch.charCodeAt(0))|0;return h;},
  getClass(){return CLASE_BASE.String;},
}))if(!String.prototype[k])Object.defineProperty(String.prototype,k,{value:f,configurable:true});
/* Integer, Double y Boolean son clases envoltorio: también heredan de Object */
const claseBase=(simple,nombre)=>Object.freeze({getSimpleName:()=>simple,getName:()=>nombre,toString:()=>'class '+nombre});
const CLASE_BASE={String:claseBase('String','java.lang.String'),Integer:claseBase('Integer','java.lang.Integer'),Double:claseBase('Double','java.lang.Double'),Boolean:claseBase('Boolean','java.lang.Boolean')};
for(const [k,f] of Object.entries({
  equals(o){return typeof o==='number'&&this.valueOf()===o&&Number.isInteger(o)===Number.isInteger(this.valueOf());},
  hashCode(){const v=this.valueOf();return Number.isInteger(v)?v|0:Math.floor(v*1000)|0;},
  intValue(){return Math.trunc(this.valueOf());},
  doubleValue(){return this.valueOf();},
  compareTo(o){const a=this.valueOf();return a<o?-1:a>o?1:0;},
  getClass(){return Number.isInteger(this.valueOf())?CLASE_BASE.Integer:CLASE_BASE.Double;},
}))if(!Number.prototype[k])Object.defineProperty(Number.prototype,k,{value:f,configurable:true});
for(const [k,f] of Object.entries({
  equals(o){return this.valueOf()===o;},
  hashCode(){return this.valueOf()?1231:1237;},
  getClass(){return CLASE_BASE.Boolean;},
}))if(!Boolean.prototype[k])Object.defineProperty(Boolean.prototype,k,{value:f,configurable:true});
/* Nombre de un arreglo de Java al imprimirlo con el toString de Object: [I@1b3a, [Ljava.lang.String;@… */
const CODIGO_ARR={int:'I',double:'D',boolean:'Z',char:'C',long:'J',float:'F',short:'S',byte:'B'};
const nombreArreglo=t=>'['+(CODIGO_ARR[t]||`L${t==='String'||t==='Object'||t==='Integer'||t==='Double'?'java.lang.'+t:t};`);

function tipoJava(v,rt){if(v===null||v===undefined)return 'null';if(typeof v==='string')return 'String';if(typeof v==='number')return Number.isInteger(v)?'int':'double';if(typeof v==='boolean')return 'boolean';const r=rt.registro[(rt.idDe(v)||0)-1];return r?r.cls:'Object';}
function crearRuntime(modelo){
  const log=[],salida=[],registro=[],ids=new WeakMap(),extra=new WeakMap();let pasos=0,nExtra=0;
  const ser=v=>{if(v===null||v===undefined)return null;if(Array.isArray(v))return {lista:Array.from(v,ser)};if(typeof v==='object'){const id=ids.get(v);return id?{ref:id}:null;}return v;};
  const foto=()=>registro.map(r=>{const f={};for(const k of Object.keys(r.raw))if(!k.startsWith('__'))f[k]=ser(r.raw[k]);return {id:r.id,cls:r.cls,f};});
  const rt={JavaError,log,salida,registro,idDe:o=>ids.get(o),foto,
    entero(v){if(typeof v!=='number')return v;if(!Number.isFinite(v))throw rt.lanzado(new rt.EXC.ArithmeticException('/ by zero'));return Math.trunc(v);},
    EXC:null,actual:null,
    /* Object: identidad, hashCode y arreglos */
    hash(o){if(o==null)return 0;let id=ids.get(o);if(!id){id=extra.get(o);if(!id){id=1000+(++nExtra)*7;extra.set(o,id);}}return (0x1b3a+id*0x2f7)|0;},
    hashDe(x){return x==null?0:typeof x.hashCode==='function'?x.hashCode():rt.hash(x);},
    iguales(a,b){if(a===b)return true;if(a==null||b==null)return false;return typeof a.equals==='function'?!!a.equals(b):false;},
    valorTexto(x){return rt.fmt(x);},
    arreglo(t,valores,n){
      let a;
      if(valores)a=[...valores];
      else{const k=Math.trunc(Number(n));if(!(k>=0))throw rt.lanzado(new rt.EXC.RuntimeException('NegativeArraySizeException: '+n));a=Array.from({length:k},()=>INTS.has(t)||t==='double'||t==='float'?0:t==='boolean'?false:t==='char'?'\0':null);}
      const ref=()=>nombreArreglo(t)+'@'+(rt.hash(a)>>>0).toString(16);
      Object.defineProperties(a,{__tipo:{value:t},toString:{value:ref},equals:{value:o=>o===a},hashCode:{value:()=>rt.hash(a)},getClass:{value:()=>claseBase(t+'[]',nombreArreglo(t))}});
      return a;
    },
    J:{Object:{[Symbol.hasInstance]:o=>o!=null},String:{[Symbol.hasInstance]:o=>typeof o==='string'},Integer:{[Symbol.hasInstance]:o=>typeof o==='number'&&Number.isInteger(o)},Long:{[Symbol.hasInstance]:o=>typeof o==='number'&&Number.isInteger(o)},
      Double:{[Symbol.hasInstance]:o=>typeof o==='number'},Float:{[Symbol.hasInstance]:o=>typeof o==='number'},Number:{[Symbol.hasInstance]:o=>typeof o==='number'},Boolean:{[Symbol.hasInstance]:o=>typeof o==='boolean'},Character:{[Symbol.hasInstance]:o=>typeof o==='string'&&o.length===1}},
    /* Excepciones: nombre de la clase de un objeto lanzable (de Java o del estudiante) */
    nombreExc(o){if(o==null||typeof o!=='object')return null;if(typeof o.__exc==='string')return o.__exc;const id=ids.get(o);const r=registro[(id||0)-1];return r&&esLanzable(modelo.clases,r.cls)?r.cls:null;},
    esExcepcion(o,nom){const n=rt.nombreExc(o);return !!n&&ancestros(modelo.clases,n).includes(nom);},
    /* Convierte lo que llegó a un catch en una excepción de Java (los errores del taller como IndexOutOfBounds también) */
    excepcion(x){
      if(rt.nombreExc(x))return x;
      const E=rt.EXC;if(!E)return null;
      if(x&&x.java){const m=/^(\w+Exception): ([\s\S]*)$/.exec(x.message);if(m&&E[m[1]])return rt.lanzado(new E[m[1]](m[2]));return null;}
      if(x instanceof TypeError&&/null|undefined/.test(x.message)){const k=/\(reading '([^']+)'\)/.exec(x.message);return rt.lanzado(new E.NullPointerException(`se usó un objeto null${k?` al pedirle ${k[1]}`:''}`));}
      return null;
    },
    atrapa(e,tipos){return tipos.some(t=>rt.esExcepcion(e,t));},
    lanzado(e){const n=rt.nombreExc(e);if(n)log.push({t:'lanza',exc:n,msg:e.__msg??null,quien:rt.actual,foto:foto()});return e;},
    atrapado(e,como){log.push({t:'atrapa',exc:rt.nombreExc(e),msg:e.__msg??null,como,foto:foto()});},
    finalmente(){log.push({t:'finally',foto:foto()});},
    implementa(o,nom){const id=ids.get(o);const r=registro[(id||0)-1];if(!r)return false;const c=modelo.clases[r.cls];return !!c&&(c.__interfaces||c.implementa).some(x=>tipoBase(x)===nom);},
    coincide(args,tipos){return tipos.every((t,i)=>{const v=args[i],b=tipoBase(t);
      if(INTS.has(b))return typeof v==='number'&&Number.isInteger(v);
      if(b==='double'||b==='float')return typeof v==='number';
      if(b==='boolean')return typeof v==='boolean';
      if(b==='char')return typeof v==='string'&&v.length===1;
      if(b==='String')return typeof v==='string'||v==null;
      if(b==='Object')return true;
      if(/^(ArrayList|List)$/.test(b)||/\[\]$/.test(t))return Array.isArray(v)||v==null;
      const C=modelo.clases[b];if(!C)return true;if(v==null)return true;
      return C.tipo==='interface'?rt.implementa(v,b):rt.esInstancia(v,b);});},
    cast(nom,v){if(v==null)return v;const C=modelo.clases[nom];if(!C)return v;
      const ok=C.tipo==='interface'?rt.implementa(v,nom):rt.esInstancia(v,nom);
      if(!ok){const id=ids.get(v),real=id?registro[id-1].cls:typeof v==='string'?'String':typeof v;
        throw new JavaError(`ClassCastException: el objeto es un ${real} y no se puede convertir a ${nom}. Comprueba antes con instanceof.`);}
      return v;},
    esInstancia(o,nom){const id=ids.get(o);const r=registro[(id||0)-1];if(!r)return false;let c=modelo.clases[r.cls];while(c){if(c.nombre===nom)return true;c=c.__padre&&modelo.clases[c.__padre];}return false;},
    agregado(lista,x){const dueno=registro.find(r=>Object.values(r.raw).includes(lista));const campo=dueno?Object.keys(dueno.raw).find(k=>dueno.raw[k]===lista):null;
      log.push({t:'add',dueno:dueno?dueno.id:null,campo,elem:x==null?null:(ids.get(x)||null),texto:x==null?'':rt.fmtCorto(x),foto:foto()});},
    fmtCorto(v){const id=ids.get(v);if(id){const r=registro[id-1];return `${r.cls}#${id}`;}return typeof v==='string'?JSON.stringify(v):String(v);},
    tick(){if(++pasos>20000)throw new JavaError('El programa dio demasiados pasos. ¿Hay un bucle que nunca termina?');},
    ref(o){const id=ids.get(o);const r=registro[(id||0)-1];return `${r?r.cls:'Object'}@${(0x1b3a+(id||0)*0x2f7).toString(16)}`;},
    fmt(v){if(v===null||v===undefined)return 'null';if(typeof v==='object')return String(v);if(typeof v==='boolean')return String(v);if(typeof v==='number'&&!Number.isInteger(v))return String(Math.round(v*1e6)/1e6);return String(v);},
    print(...a){rt.tick();const t=a.map(rt.fmt).join('');salida.push(t);log.push({t:'print',texto:t,foto:foto()});},
    track(raw,cls){
      const c=modelo.clases[cls];const id=registro.length+1;
      const tipos=Object.fromEntries((c.__campos||c.campos).filter(f=>!f.estatico).map(f=>[f.nombre,f.tipo]));
      const mets=new Set((c.__metodos||c.metodos).map(m=>m.nombre));
      registro.push({id,cls,raw});
      log.push({t:'crear',id,cls,estado:{...raw},foto:foto()});
      const coercer=(t,v,k)=>{const b=tipoBase(t);const mal=()=>{throw new JavaError(`Tipos incompatibles: ${cls}.${k} es ${t} y le estás asignando un ${tipoJava(v,rt)}.`);};
        if(/\[\]$/.test(t.replace(/\s+/g,''))){if(v!==null&&!Array.isArray(v))mal();return v;}
        if(INTS.has(b)){if(typeof v!=='number')mal();return Math.trunc(v);}
        if(b==='double'||b==='float'){if(typeof v!=='number')mal();return v;}
        if(b==='boolean'){if(typeof v!=='boolean')mal();return v;}
        if(b==='String'||b==='char'){if(v!==null&&typeof v!=='string')mal();return v;}
        if(v!==null&&typeof v!=='object')mal();return v;};
      const p=new Proxy(raw,{
        set(o,k,v){rt.tick();if(typeof k==='string'&&k.startsWith('__')){o[k]=v;return true;}if(typeof k==='string'){if(!(k in tipos))throw new JavaError(`La clase ${cls} no tiene un atributo llamado ${k}.`);v=coercer(tipos[k],v,k);o[k]=v;log.push({t:'set',id,campo:k,valor:v,foto:foto()});}else o[k]=v;return true;},
        get(o,k){
          if(typeof k==='string'&&k.startsWith('__'))return Reflect.get(o,k);
          if(typeof k==='string'&&!(k in o)&&!['then','toJSON','asymmetricMatch','$$typeof','nodeType'].includes(k))throw new JavaError(`${cls} no tiene un atributo ni un método llamado ${k}.`);
          const v=Reflect.get(o,k);
          if(typeof k==='string'&&typeof v==='function'&&mets.has(k))return function(...args){rt.tick();log.push({t:'llamada',id,metodo:k,args:args.map(a=>rt.fmtCorto(a)),argIds:args.map(a=>(a&&typeof a==='object'&&ids.get(a))||null),antes:{...o},foto:foto()});const prev=rt.actual;rt.actual=id;try{return v.apply(this,args);}finally{rt.actual=prev;}};
          return v;}
      });
      ids.set(raw,id);ids.set(p,id);return p;
    }};
  return rt;
}
function traducirError(e,rt){
  const n=rt&&rt.nombreExc?.(e);
  if(n){const m=e.__msg;return `Excepción sin atrapar: ${n}${m!=null?`: ${m}`:''}. Nadie la atrapó con try/catch, así que el programa se detuvo.`;}
  if(e&&e.java)return e.message;
  const msg=String((e&&e.message)||e);let m;
  if(e instanceof ReferenceError&&(m=/^(\S+) is not defined/.exec(msg)))return `No encuentro el símbolo «${m[1]}». ¿Lo declaraste antes de usarlo, o está escrito distinto?`;
  if(e instanceof TypeError&&(m=/Cannot (?:read|set) propert(?:y|ies) of (?:null|undefined)(?: \((?:reading|setting) '([^']+)'\))?/.exec(msg)))return `NullPointerException: estás usando un objeto que todavía es null${m[1]?` (al acceder a «${m[1]}»)`:''}. ¿Olvidaste crearlo con new?`;
  if(e instanceof TypeError&&/is (?:null|undefined)$/.test(msg))return 'NullPointerException: estás usando un objeto que todavía es null. ¿Olvidaste crearlo con new?';
  if(e instanceof TypeError&&(m=/([\w.$]+) is not a function/.exec(msg)))return `No existe el método «${m[1].split('.').pop()}». Revisa el nombre y en qué clase lo declaraste.`;
  if(e instanceof TypeError&&/is not a constructor/.test(msg))return 'Estás usando new con algo que no es una clase.';
  if(e instanceof SyntaxError)return `Error de sintaxis: revisa paréntesis, llaves y punto y coma. (${msg})`;
  if(e instanceof RangeError)return 'StackOverflowError: un método se llamó a sí mismo demasiadas veces.';
  return 'Error al ejecutar: '+msg;
}
function ejecutar(modelo,arnes){
  const rt=crearRuntime(modelo);
  const nombres=Object.keys(modelo.clases);
  const js=PRELUDIO+Object.values(modelo.clases).map(c=>genClase(c,modelo)).join('\n')+`\nreturn {${[...nombres,'__lista:ArrayList'].join(',')}};`;
  let C;
  try{C=new Function('__rt',js)(rt);}catch(e){return {rt,error:traducirError(e,rt),js};}
  try{arnes(C,rt);}catch(e){return {rt,error:traducirError(e,rt),js};}
  return {rt,js};
}
function repasar(log){
  const est={},frames=[],info={apagados:[],recargas:[],costos:[]},ultimo={};
  const eti=(e,id)=>e&&e.nombre?e.nombre:`${e?e.__cls:'obj'}#${id}`;
  let ultimaFoto=[];
  const snap=(cap,tipo,extra={})=>frames.push({tipo,cap,...extra,objetos:ultimaFoto,robots:Object.entries(est).filter(([,e])=>e.__cls==='Robot').map(([id,e])=>({id:+id,...e}))});
  const mostrar=v=>typeof v==='string'?JSON.stringify(v):String(v);
  for(const ev of log){
    if(ev.foto)ultimaFoto=ev.foto;
    if(ev.t==='add'){const d=est[ev.dueno];snap(`${d?eti(d,ev.dueno):'lista'}${ev.campo?'.'+ev.campo:''}${ev.texto?`.add(${ev.texto})`:' cambió'}`,'add',{dueno:ev.dueno,elem:ev.elem});continue;}
    if(ev.t==='crear'){est[ev.id]={__cls:ev.cls,...ev.estado};snap(`new ${ev.cls}(…)`,'crear',{quien:ev.id,cls:ev.cls});}
    else if(ev.t==='set'){
      const e=est[ev.id];const antes=e[ev.campo];
      if(!(e.__off&&ev.campo==='x'))e[ev.campo]=ev.valor;
      if(ev.campo==='energia'&&ultimo[ev.id]==='avanzar'&&typeof antes==='number'&&typeof ev.valor==='number')info.costos.push(antes-ev.valor);
      if(ev.campo==='energia'&&typeof ev.valor==='number'&&ev.valor<0&&!e.__off){e.__off=true;info.apagados.push({id:ev.id,x:e.x??0,nombre:e.nombre});}
      snap(`${eti(e,ev.id)}.${ev.campo} = ${mostrar(ev.valor)}`,ev.campo==='x'?'x':ev.campo==='energia'?'energia':'set',{quien:ev.id,campo:ev.campo,valor:typeof ev.valor==='object'&&ev.valor?null:ev.valor});
    }
    else if(ev.t==='llamada'){ultimo[ev.id]=ev.metodo;const e=est[ev.id];if(ev.metodo==='recargar')info.recargas.push({id:ev.id,x:ev.antes.x});snap(`${eti(e,ev.id)}.${ev.metodo}(${ev.args.join(', ')})`,'llamada',{quien:ev.id,metodo:ev.metodo,argIds:ev.argIds});}
    else if(ev.t==='print')snap(`System.out.println → ${ev.texto}`,'print');
    else if(ev.t==='lanza')snap(`throw ${ev.exc}${ev.msg!=null?`: «${ev.msg}»`:''}`,'lanza',{exc:ev.exc,msg:ev.msg,quien:ev.quien});
    else if(ev.t==='atrapa')snap(`catch (${ev.como}) atrapó ${ev.exc}`,'atrapa',{exc:ev.exc,msg:ev.msg,como:ev.como});
    else if(ev.t==='finally')snap('finally { … } se ejecuta siempre','finally');
  }
  return {frames,info,estados:est};
}

/* ---------- UML: miembros y relaciones ---------- */
const VIS={public:'+',private:'-',protected:'#',package:'~'};
function miembrosUML(c){
  const atr=c.campos.map(f=>({t:`${VIS[f.vis]} ${f.nombre} : ${f.tipo}${f.final&&f.estatico?' {readOnly}':''}`,st:f.estatico}));
  const ops=[...c.ctors.map(k=>({t:`${VIS[k.vis]} ${c.nombre}(${k.params.map(p=>`${p.nombre} : ${p.tipo}`).join(', ')})`,st:false})),
    ...c.metodos.map(m=>({t:`${VIS[m.vis]} ${m.nombre}(${m.params.map(p=>`${p.nombre} : ${p.tipo}`).join(', ')}) : ${m.ret}`,st:m.estatico,ab:m.abstracto}))];
  return {atr,ops};
}
const elementoDe=t=>{const g=/^(?:ArrayList|List)\s*<\s*([\w$]+)\s*>$/.exec(t.replace(/\s+/g,''));if(g)return {cls:g[1],coleccion:true};if(/\[\]$/.test(t))return {cls:tipoBase(t),coleccion:true};return {cls:tipoBase(t),coleccion:false};};
const esc=s=>s.replace(/[$]/g,'\\$');
/* Tipos de relación que el taller reconoce en el código:
   realizacion  A implements B
   composicion  A guarda un B que crea él mismo (new B dentro de A) y nadie se lo pasa desde fuera
   agregacion   A guarda una colección de B que le entregan desde fuera
   asociacion   A guarda una referencia a un B que existe por su cuenta
   dependencia  A usa B de paso (parámetro, variable local o new) sin guardarlo */
function relaciones(modelo){
  const rel=[],cs=Object.values(modelo.clases);
  for(const a of cs){
    const cuerpos=[...a.ctors,...a.metodos.filter(x=>!x.abstracto)];
    const todo=a.cuerpoBlank;
    if(a.__padre)rel.push({de:a.nombre,a:a.__padre,tipo:'herencia',razon:`${a.nombre} extiende ${a.__padre}: hereda sus atributos y métodos.`});
    for(const i of a.implementa){const b=tipoBase(i);if(modelo.clases[b])rel.push({de:a.nombre,a:b,tipo:'realizacion',razon:`${a.nombre} implementa la interfaz ${b}: se compromete a tener todos sus métodos.`});}
    const conCampo=new Set();
    for(const f of a.campos){
      const {cls,coleccion}=elementoDe(f.tipo);const b=modelo.clases[cls];
      if(!b||cls===a.nombre)continue;
      conCampo.add(cls);
      const fn=esc(f.nombre);
      const locNuevos=[...todo.matchAll(new RegExp(`\\b([a-z_$][\\w$]*)\\s*=\\s*new\\s+${cls}\\s*\\(`,'g'))].map(x=>x[1]);
      const crea=locNuevos.some(v=>new RegExp(`${fn}\\s*\\.\\s*add\\s*\\(\\s*${esc(v)}\\s*\\)|(?:(?<![\\w$.])|this\\s*\\.\\s*)${fn}\\s*=\\s*${esc(v)}\\b`).test(todo))||new RegExp(`(?:(?<![\\w$.])|this\\s*\\.\\s*)${fn}\\s*=\\s*new\\s+${cls}\\s*\\(`).test(todo)||new RegExp(`${fn}\\s*\\.\\s*add\\s*\\(\\s*new\\s+${cls}\\s*\\(`).test(todo)||(f.init&&new RegExp(`new\\s+${cls}\\s*\\(`).test(f.init));
      const params=cuerpos.flatMap(k=>k.params.filter(p=>elementoDe(p.tipo).cls===cls||tipoBase(p.tipo)===cls).map(p=>({k,p})));
      const deFuera=params.some(({k,p})=>new RegExp(`(?:(?<![\\w$.])|this\\s*\\.\\s*)${fn}\\s*=\\s*${esc(p.nombre)}\\b|${fn}\\s*\\.\\s*add\\s*\\(\\s*${esc(p.nombre)}\\s*\\)`).test(k.cuerpoBlank));
      let tipo,mult,razon;
      if(crea&&!deFuera){tipo='composicion';mult=coleccion?'0..*':'1';razon=`${a.nombre} crea su propio${coleccion?'s':''} ${cls} (${f.nombre}) y nadie se ${coleccion?'los':'lo'} entrega desde fuera: si el ${a.nombre} desaparece, sus partes también.`;}
      else if(coleccion){tipo='agregacion';mult='0..*';razon=`${a.nombre} reúne varios ${cls} en ${f.nombre}, pero los recibe ya creados: los ${cls} siguen existiendo sin el ${a.nombre}.`;}
      else{tipo='asociacion';mult='0..1';razon=`${a.nombre} conoce a un ${cls} (${f.nombre}) que existe por su cuenta.`;}
      rel.push({de:a.nombre,a:cls,tipo,mult,campo:f.nombre,razon});
    }
    for(const b of cs){
      if(b===a||conCampo.has(b.nombre)||a.implementa.some(i=>tipoBase(i)===b.nombre))continue;
      const nb=esc(b.nombre);
      const crea=new RegExp(`\\bnew\\s+${nb}\\s*\\(`).test(todo);
      const usa=cuerpos.some(k=>k.params.some(p=>elementoDe(p.tipo).cls===b.nombre))||new RegExp(`\\b${nb}(?:\\s*<[^>]*>)?\\s+[a-z_$][\\w$]*\\s*[=;]`).test(todo)||new RegExp(`\\b${nb}\\s*\\.\\s*[\\w$]+`).test(todo);
      if(crea||usa)rel.push({de:a.nombre,a:b.nombre,tipo:'dependencia',etiqueta:crea?'crea':'usa',razon:crea?`${a.nombre} crea objetos ${b.nombre} pero no los guarda: es una dependencia.`:`${a.nombre} usa un ${b.nombre} de paso (como parámetro o variable) sin guardarlo.`});
    }
  }
  return rel;
}
const FLECHA={composicion:'*--',agregacion:'o--',asociacion:'-->',dependencia:'..>',realizacion:'..|>',herencia:'--|>'};
function plantuml(modelo){
  const L=['@startuml','skinparam classAttributeIconSize 0',''];
  for(const c of Object.values(modelo.clases)){
    const {atr,ops}=miembrosUML(c);
    L.push(`${c.tipo==='interface'?'interface':c.abstracta?'abstract class':'class'} ${c.nombre} {`);
    for(const a of atr)L.push('  '+(a.st?a.t.replace(/^(\S) /,'$1 {static} '):a.t));
    for(const o of ops)L.push('  '+(o.st?o.t.replace(/^(\S) /,'$1 {static} '):o.ab&&c.tipo!=='interface'?o.t.replace(/^(\S) /,'$1 {abstract} '):o.t));
    L.push('}','');
  }
  for(const r of relaciones(modelo)){
    const m=r.mult?` "${r.mult}"`:'';
    const et=r.tipo==='dependencia'?` : ${r.etiqueta}`:r.campo?` : ${r.campo}`:'';
    L.push(`${r.de} ${FLECHA[r.tipo]}${m} ${r.a}${et}`);
  }
  L.push('@enduml');
  return L.join('\n').replace(/\n{3,}/g,'\n\n');
}

/* ---------- Niveles ---------- */
export {JavaError,EXC_PADRE,esLanzable,esComprobada,ancestros,blankComments,blankStrings,parsePrograma,ejecutar,repasar,plantuml,miembrosUML,relaciones,crearRuntime,tipoBase};
