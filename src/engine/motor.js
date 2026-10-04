/* Motor del taller: analiza un subconjunto de Java, lo traduce a JS y registra eventos. */
const PRIM=new Set(['int','double','float','long','short','byte','boolean','char','String','void']);
const INTS=new Set(['int','long','short','byte']);
const CONOCIDOS=new Set(['ArrayList','List','Object','Integer','Double','Boolean','Math','Comparable','Collections']);
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
      if(mt.override&&!sup&&!contrato)errores.push(E(c.archivo,mt.linea,`${mt.nombre}() tiene @Override, pero no redefine un método heredado ni implementa uno de una interfaz.`));
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
  errores.sort((a,b)=>a.archivo===b.archivo?a.linea-b.linea:a.archivo<b.archivo?-1:1);
  return {clases,errores};
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
    if(blank[j]===';'){campo(c,hc,crudo,linea,errores);i=j+1;}
    else if(blank[j]==='{'){const close=llaveFinal(blank,j);metodo(c,hb,crudo,clean.slice(j,close+1),blank.slice(j,close+1),L(j),linea,errores);i=close+1;}
    else{errores.push(E(archivo,L(j),'Sobra una llave } en esta línea.'));i=j+1;}
  }
}
function campo(c,texto,crudo,linea,errores){
  const A=c.archivo;
  const sig=/^((?:(?:public|private|protected|static|final|abstract|default)\s+)*)([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+([A-Za-z_$][\w$]*)\s*\(([^()]*)\)$/.exec(texto);
  if(sig&&!PALABRAS.has(sig[2])){
    if(c.tipo==='interface'||/\babstract\b/.test(sig[1])){
      const params=[];
      for(const p of partirComas(sig[4])){const m=/^(?:final\s+)?(\S+(?:\s*<[^>]*>)?)\s+([A-Za-z_$][\w$]*)$/.exec(p);if(!m){errores.push(E(A,linea,`El parámetro «${p}» necesita tipo y nombre.`));return;}params.push({tipo:m[1].replace(/\s+/g,''),nombre:m[2]});}
      c.metodos.push({nombre:sig[3],ret:sig[2].replace(/\s+/g,''),params,vis:c.tipo==='interface'?'public':visDe(sig[1]),abstracto:true,estatico:false,linea,cuerpo:'',cuerpoBlank:''});
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
    c.campos.push({nombre:m[1],tipo,vis:visDe(r[1]),estatico:/\bstatic\b/.test(r[1]),final:/\bfinal\b/.test(r[1]),init:m[2]??null,linea});
  }
}
function metodo(c,h,crudo,cuerpo,cuerpoBlank,lineaCuerpo,linea,errores){
  const A=c.archivo;
  const r=/^((?:(?:public|private|protected|static|final|abstract|synchronized|default)\s+)*)(?:([A-Za-z_$][\w$]*(?:\s*<[^>]*>)?(?:\s*\[\s*\])*)\s+)?([A-Za-z_$][\w$]*)\s*\(([^()]*)\)(?:\s*throws\s+[\w\s,.]+)?$/.exec(h);
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
  const base={params,vis:c.tipo==='interface'?'public':visDe(mods),cuerpo,cuerpoBlank,linea};
  if(!tipo){
    if(nombre===c.nombre)c.ctors.push(base);
    else errores.push(E(A,linea,`El método ${nombre} necesita un tipo de retorno. Si no devuelve nada, usa void: public void ${nombre}()`));
    return;
  }
  if(nombre===c.nombre){errores.push(E(A,linea,`¿Querías un constructor? Los constructores no llevan tipo de retorno: quita «${tipo}».`));return;}
  c.metodos.push({...base,nombre,ret:tipo,estatico:/\bstatic\b/.test(mods)});
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
function traducir(code,c,locales,self,retTipo){
  const lits=[];
  code=code.replace(/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g,m=>{lits.push(m);return `__S${lits.length-1}__`;});
  const loc=new Set(locales);const enteros=new Set();
  code=code.replace(RE_DECL,(m,pre,tipo,nombre)=>{loc.add(nombre);if(INTS.has(tipo.trim()))enteros.add(nombre);return `${pre}let ${nombre}`;});
  code=envolverEnteros(code,enteros,retTipo&&INTS.has(retTipo));
  code=code.replace(/for\s*\(\s*let\s+([A-Za-z_$][\w$]*)\s*:/g,'for (let $1 of');
  code=instrumentarBucles(code);
  code=code.replace(/\bSystem\s*\.\s*out\s*\.\s*print(?:ln|f)?\s*\(/g,'__rt.print(');
  code=code.replace(/\.length\s*\(\s*\)/g,'.length');
  code=code.replace(/\(\s*(?:int|long)\s*\)\s*/g,'~~').replace(/\(\s*(?:double|float)\s*\)\s*/g,'+');
  code=code.replace(/\(\s*[A-Z][\w$]*(?:\s*<[^<>()]*>)?\s*\)\s*(?=[\w$(])/g,'');
  code=code.replace(/\bnew\s+([A-Za-z_$][\w$]*)\s*<[^>]*>/g,'new $1');
  code=code.replace(/\bthis\b/g,self);
  for(const f of c.campos){
    if(loc.has(f.nombre))continue;
    code=code.replace(new RegExp(`(?<![\\w$.])${f.nombre}\\b(?!\\s*\\()`,'g'),`${f.estatico?c.nombre:self}.${f.nombre}`);
  }
  for(const [f,dueno] of c.__constantes||[]){
    if(loc.has(f))continue;
    code=code.replace(new RegExp(`(?<![\\w$.])${f}\\b(?!\\s*\\()`,'g'),`${dueno}.${f}`);
  }
  code=code.replace(/(?<![\w$.])getClass\s*\(/g,`${self}.getClass(`);
  for(const mn of new Set(c.metodos.filter(x=>!x.abstracto).map(x=>x.nombre))){
    const est=c.metodos.find(x=>x.nombre===mn).estatico;
    code=code.replace(new RegExp(`(?<![\\w$.])${mn}\\s*\\(`,'g'),`${est?c.nombre:self}.${mn}(`);
  }
  return code.replace(/__S(\d+)__/g,(m,k)=>lits[+k]);
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
  for(const f of est)s+=`static ${f.nombre} = ${f.init!=null?traducir(f.init,c,[],c.nombre):defVal(f.tipo)};\n`;
  s+=`constructor(...__a){\n${inst.map(f=>`this.${f.nombre}=${defVal(f.tipo)};`).join('')}\nconst __self=__rt.track(this,${JSON.stringify(c.nombre)});\n`;
  for(const f of inst)if(f.init!=null){const d=Object.values(modelo.clases).find(x=>x.campos.includes(f))||c;s+=`__self.${f.nombre}=(${traducir(f.init,d,[],'__self')});\n`;}
  const ctors=c.ctors.length?c.ctors:[{params:[],cuerpo:'{}'}];
  s+='switch(__a.length){\n';
  for(const k of ctors){const ns=k.params.map(p=>p.nombre);s+=`case ${ns.length}: { let [${ns.join(',')}]=__a;\n${traducir(k.cuerpo,c,ns,'__self')}\nreturn __self; }\n`;}
  s+=`}\nthrow new __rt.JavaError(${JSON.stringify(`No existe un constructor ${c.nombre}(...) que reciba `)}+__a.length+' argumento(s).');\n}\n`;
  const grupos=new Map();for(const m of metodos.filter(x=>!x.abstracto)){if(!grupos.has(m.nombre))grupos.set(m.nombre,[]);grupos.get(m.nombre).push(m);}
  for(const [nm,g] of grupos){
    const st=g[0].estatico;
    s+=`${st?'static ':''}${nm}(...__a){ switch(__a.length){\n`;
    for(const m of g){const ns=m.params.map(p=>p.nombre),d=declaracion(m);s+=`case ${ns.length}: { let [${ns.join(',')}]=__a;\n${traducir(m.cuerpo,d,ns,st?d.nombre:'this',m.ret)}\nreturn; }\n`;}
    s+=`}\nthrow new __rt.JavaError(${JSON.stringify(`El método ${nm} no recibe `)}+__a.length+' argumento(s).'); }\n`;
  }
  if(!grupos.has('toString'))s+='toString(){ return __rt.ref(this); }\n';
  s+=`getClass(){ return ${c.nombre}; }\n`;
  return s+'}\n';
}
const PRELUDIO=`class ArrayList extends Array{constructor(){super();} add(x){__rt.tick();this.push(x);__rt.agregado(this,x);return true;} get(i){if(i<0||i>=this.length)throw new __rt.JavaError('IndexOutOfBoundsException: la posición '+i+' no existe; la lista tiene '+this.length+' elemento(s).');return this[i];} size(){return this.length;} isEmpty(){return this.length===0;} remove(i){const x=this.splice(typeof i==='number'?i:this.indexOf(i),1)[0];__rt.agregado(this,null);return x;} contains(x){return this.includes(x);} clear(){this.length=0;}}
const List=ArrayList;
const Collections={sort(l,c){l.sort((a,b)=>c?c.compare(a,b):a.compareTo(b));__rt.agregado(l,null);}};
const Integer={parseInt:s=>parseInt(s,10),compare:(a,b)=>a<b?-1:a>b?1:0,MAX_VALUE:2147483647,MIN_VALUE:-2147483648};\n`;
for(const [k,f] of Object.entries({
  equals(o){return this.valueOf()===o;},
  equalsIgnoreCase(o){return o!=null&&this.toLowerCase()===String(o).toLowerCase();},
  isEmpty(){return this.length===0;},
  contains(o){return this.includes(o);},
  compareTo(o){const a=this.valueOf();return a<o?-1:a>o?1:0;},
}))if(!String.prototype[k])Object.defineProperty(String.prototype,k,{value:f,configurable:true});

function tipoJava(v,rt){if(v===null||v===undefined)return 'null';if(typeof v==='string')return 'String';if(typeof v==='number')return Number.isInteger(v)?'int':'double';if(typeof v==='boolean')return 'boolean';const r=rt.registro[(rt.idDe(v)||0)-1];return r?r.cls:'Object';}
function crearRuntime(modelo){
  const log=[],salida=[],registro=[],ids=new WeakMap();let pasos=0;
  const ser=v=>{if(v===null||v===undefined)return null;if(Array.isArray(v))return {lista:Array.from(v,ser)};if(typeof v==='object'){const id=ids.get(v);return id?{ref:id}:null;}return v;};
  const foto=()=>registro.map(r=>{const f={};for(const k of Object.keys(r.raw))f[k]=ser(r.raw[k]);return {id:r.id,cls:r.cls,f};});
  const rt={JavaError,log,salida,registro,idDe:o=>ids.get(o),foto,
    entero(v){return typeof v==='number'?Math.trunc(v):v;},
    implementa(o,nom){const id=ids.get(o);const r=registro[(id||0)-1];if(!r)return false;const c=modelo.clases[r.cls];return !!c&&(c.__interfaces||c.implementa).some(x=>tipoBase(x)===nom);},
    esInstancia(o,nom){const id=ids.get(o);const r=registro[(id||0)-1];if(!r)return false;let c=modelo.clases[r.cls];while(c){if(c.nombre===nom)return true;c=c.__padre&&modelo.clases[c.__padre];}return false;},
    agregado(lista,x){const dueno=registro.find(r=>Object.values(r.raw).includes(lista));const campo=dueno?Object.keys(dueno.raw).find(k=>dueno.raw[k]===lista):null;
      log.push({t:'add',dueno:dueno?dueno.id:null,campo,elem:x==null?null:(ids.get(x)||null),texto:x==null?'':rt.fmtCorto(x),foto:foto()});},
    fmtCorto(v){const id=ids.get(v);if(id){const r=registro[id-1];return `${r.cls}#${id}`;}return typeof v==='string'?JSON.stringify(v):String(v);},
    tick(){if(++pasos>20000)throw new JavaError('El programa dio demasiados pasos. ¿Hay un bucle que nunca termina?');},
    ref(o){const id=ids.get(o);const r=registro[(id||0)-1];return `${r?r.cls:'Object'}@${(0x1b3a+(id||0)*0x2f7).toString(16)}`;},
    fmt(v){if(v===null||v===undefined)return 'null';if(typeof v==='object')return String(v);if(typeof v==='number'&&!Number.isInteger(v))return String(Math.round(v*1e6)/1e6);return String(v);},
    print(...a){rt.tick();const t=a.map(rt.fmt).join('');salida.push(t);log.push({t:'print',texto:t,foto:foto()});},
    track(raw,cls){
      const c=modelo.clases[cls];const id=registro.length+1;
      const tipos=Object.fromEntries((c.__campos||c.campos).filter(f=>!f.estatico).map(f=>[f.nombre,f.tipo]));
      const mets=new Set((c.__metodos||c.metodos).map(m=>m.nombre));
      registro.push({id,cls,raw});
      log.push({t:'crear',id,cls,estado:{...raw},foto:foto()});
      const coercer=(t,v,k)=>{const b=tipoBase(t);const mal=()=>{throw new JavaError(`Tipos incompatibles: ${cls}.${k} es ${t} y le estás asignando un ${tipoJava(v,rt)}.`);};
        if(INTS.has(b)){if(typeof v!=='number')mal();return Math.trunc(v);}
        if(b==='double'||b==='float'){if(typeof v!=='number')mal();return v;}
        if(b==='boolean'){if(typeof v!=='boolean')mal();return v;}
        if(b==='String'||b==='char'){if(v!==null&&typeof v!=='string')mal();return v;}
        if(v!==null&&typeof v!=='object')mal();return v;};
      const p=new Proxy(raw,{
        set(o,k,v){rt.tick();if(typeof k==='string'){if(!(k in tipos))throw new JavaError(`La clase ${cls} no tiene un atributo llamado ${k}.`);v=coercer(tipos[k],v,k);o[k]=v;log.push({t:'set',id,campo:k,valor:v,foto:foto()});}else o[k]=v;return true;},
        get(o,k){
          if(typeof k==='string'&&!(k in o)&&!['then','toJSON','asymmetricMatch','$$typeof','nodeType'].includes(k))throw new JavaError(`${cls} no tiene un atributo ni un método llamado ${k}.`);
          const v=Reflect.get(o,k);
          if(typeof k==='string'&&typeof v==='function'&&mets.has(k))return function(...args){rt.tick();log.push({t:'llamada',id,metodo:k,args:args.map(a=>rt.fmtCorto(a)),argIds:args.map(a=>(a&&typeof a==='object'&&ids.get(a))||null),antes:{...o},foto:foto()});return v.apply(this,args);};
          return v;}
      });
      ids.set(raw,id);ids.set(p,id);return p;
    }};
  return rt;
}
function traducirError(e){
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
  const js=PRELUDIO+Object.values(modelo.clases).map(c=>genClase(c,modelo)).join('\n')+`\nreturn {${nombres.join(',')}};`;
  let C;
  try{C=new Function('__rt',js)(rt);}catch(e){return {rt,error:traducirError(e),js};}
  try{arnes(C,rt);}catch(e){return {rt,error:traducirError(e),js};}
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
export {JavaError,blankComments,blankStrings,parsePrograma,ejecutar,repasar,plantuml,miembrosUML,relaciones,crearRuntime,tipoBase};
