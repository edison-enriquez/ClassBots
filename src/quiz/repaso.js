/* Quiz de repaso para el aula en vivo: preguntas gemelas del examen de los mundos 1 a 6.
   Mismo concepto y la misma trampa que el examen, pero otro código y otro dominio, para que el
   repaso entrene la habilidad sin adelantar las respuestas. Las salidas se verificaron con javac. */

export const QUIZ_REPASO = {
  id: 'repaso-1-6',
  titulo: 'Repaso · mundos 1 a 6',
  preguntas: [
    {
      id: 'referencias',
      mundo: 1,
      concepto: 'Objetos y referencias',
      enunciado: '¿Qué imprime?',
      codigo: `class Libro {
    private String titulo;
    Libro(String t) { titulo = t; }
    void setTitulo(String t) { titulo = t; }
    String getTitulo() { return titulo; }
}

Libro a = new Libro("POO");
Libro b = new Libro("POO");
Libro c = a;
c.setTitulo("Java");
System.out.println(a.getTitulo() + " " + b.getTitulo()
    + " " + (a == c) + " " + (a == b));`,
      opciones: ['Java POO true false', 'Java Java true true', 'POO POO true false', 'Java POO true true'],
      correcta: 0,
      explicacion: 'c y a son la misma referencia: cambiar c cambia a. b es otro objeto, aunque tenga el mismo título, y == compara referencias, no contenidos.',
    },
    {
      id: 'this',
      mundo: 1,
      concepto: 'Constructor y this',
      enunciado: '¿Qué devuelve getCorreo()?',
      codigo: `class Usuario {
    private String correo;
    Usuario(String correo) {
        correo = correo;
    }
    String getCorreo() { return correo; }
}

new Usuario("ana@uni.edu").getCorreo();`,
      opciones: ['"ana@uni.edu"', 'null', '"" (texto vacío)', 'No compila'],
      correcta: 1,
      explicacion: 'Dentro del constructor, correo es el parámetro: se asigna a sí mismo y el atributo nunca cambia. Falta this.correo = correo.',
    },
    {
      id: 'static',
      mundo: 2,
      concepto: 'static frente a atributo de instancia',
      enunciado: '¿Qué imprime?',
      codigo: `class Turno {
    private static int contador = 0;
    private int numero;
    Turno() { contador++; numero = contador; }
    int getNumero() { return numero; }
    static int total() { return contador; }
}

Turno x = new Turno();
Turno y = new Turno();
Turno z = y;
System.out.println(x.getNumero() + " " + z.getNumero()
    + " " + Turno.total());`,
      opciones: ['1 2 3', '1 2 2', '2 2 2', '1 1 2'],
      correcta: 1,
      explicacion: 'contador es uno solo para toda la clase; numero es de cada objeto. Se crearon dos turnos: z no crea nada, es otra etiqueta para y.',
    },
    {
      id: 'composicion',
      mundo: 3,
      concepto: 'Composición',
      enunciado: 'El diseño quiere composición: solo el carro controla su motor. ¿Qué rompe esa regla?',
      codigo: `class Motor {
    private int rpm;
    void acelerar(int d) { rpm += d; }
}

class Carro {
    private final Motor motor = new Motor();
    Motor getMotor() { return motor; }
}`,
      opciones: ['private final Motor motor', 'Crear el motor dentro de Carro', 'getMotor() entrega la referencia interna', 'Que acelerar() no sea private'],
      correcta: 2,
      explicacion: 'Con carro.getMotor().acelerar(500) cualquiera controla el motor desde afuera. En composición, la parte no se entrega: el carro expone solo lo que él decide.',
    },
    {
      id: 'agregacion',
      mundo: 3,
      concepto: 'Agregación',
      enunciado: 'Una playlist agrupa canciones. Si se borra la playlist, las canciones siguen en la biblioteca y pueden estar en otras playlists. ¿Qué relación hay de Playlist a Cancion?',
      codigo: '',
      opciones: ['Asociación simple', 'Agregación', 'Composición', 'Dependencia'],
      correcta: 1,
      explicacion: 'El todo agrupa partes que viven por su cuenta y se pueden compartir: agregación (rombo vacío). En composición la parte muere con el todo.',
    },
    {
      id: 'interfaz',
      mundo: 4,
      concepto: 'Interfaz frente a clase abstracta',
      enunciado: 'Drones y celulares deben reportar su batería. Un dron es una Maquina; un celular no. ¿Dónde va reportarBateria()?',
      codigo: '',
      opciones: ['En la clase abstracta Maquina', 'En una interfaz que implementan Dron y Celular', 'Copiado en cada clase, sin contrato común', 'Como método static en una clase Utilidades'],
      correcta: 1,
      explicacion: 'Celular no puede heredar de Maquina sin mentir, y Java no permite dos superclases. Una interfaz pone el contrato a través de jerarquías distintas.',
    },
    {
      id: 'comparable',
      mundo: 4,
      concepto: 'Comparable',
      enunciado: '¿Qué compareTo ordena a los jugadores de MAYOR a menor puntaje con Collections.sort?',
      codigo: `class Jugador implements Comparable<Jugador> {
    private int puntaje;
    public int compareTo(Jugador o) {
        // ¿cuál va aquí?
    }
}`,
      opciones: ['return Integer.compare(puntaje, o.puntaje);', 'return Integer.compare(o.puntaje, puntaje);', 'return puntaje - o.puntaje;', 'return o.puntaje == puntaje ? 0 : 1;'],
      correcta: 1,
      explicacion: 'sort pone primero al que compareTo considera menor. Invertir el orden de los argumentos invierte el orden: queda de mayor a menor. La opción D no es un orden válido.',
    },
    {
      id: 'abstracta',
      mundo: 5,
      concepto: 'Clases abstractas y herencia multinivel',
      enunciado: '¿Qué imprime?',
      codigo: `abstract class Maquina {
    abstract String sonido();
    String presentar() { return "Soy " + sonido(); }
}
class Grua extends Maquina {
    String sonido() { return "clang"; }
}
class GruaTorre extends Grua {
    @Override
    String sonido() { return "CLANG"; }
}

Maquina m = new GruaTorre();
System.out.println(m.presentar());`,
      opciones: ['Soy clang', 'Soy CLANG', 'No compila: Maquina es abstracta', 'Soy null'],
      correcta: 1,
      explicacion: 'Una clase abstracta no se instancia, pero sí sirve como tipo de la variable. presentar() se hereda, y dentro de ella sonido() ejecuta la redefinición más especializada: la de GruaTorre.',
    },
    {
      id: 'redefinicion',
      mundo: 6,
      concepto: 'Sobrecarga frente a redefinición',
      enunciado: '¿Qué imprime?',
      codigo: `class Animal {
    String hablar() { return "..."; }
    String comer(int g) { return "Animal int"; }
}
class Perro extends Animal {
    @Override
    String hablar() { return "Guau"; }
    String comer(double g) { return "Perro double"; }
}

Animal a = new Perro();
System.out.println(a.hablar() + " / " + a.comer(2));`,
      opciones: ['Guau / Animal int', 'Guau / Perro double', '... / Animal int', 'No compila'],
      correcta: 0,
      explicacion: 'hablar() está redefinido: manda el tipo real (Perro). comer(double) es una sobrecarga, no una redefinición, y el tipo declarado Animal solo conoce comer(int).',
    },
    {
      id: 'tipo-declarado',
      mundo: 6,
      concepto: 'Tipo declarado frente a tipo real',
      enunciado: 'Con las mismas clases Animal y Perro, ¿qué pasa con esta línea?',
      codigo: `Animal a = new Perro();
a.comer(2.5);`,
      opciones: ['Ejecuta Perro: comer(double)', 'Ejecuta Animal: comer(int)', 'No compila', 'Compila y lanza un error al ejecutar'],
      correcta: 2,
      explicacion: 'El compilador solo mira el tipo declarado. Animal no tiene comer(double), y un double no pasa solo a int. Se decide antes de ejecutar.',
    },
    {
      id: 'abierto-cerrado',
      mundo: 6,
      concepto: 'Polimorfismo y abierto/cerrado',
      enunciado: 'Torneo recorre una List<Luchador> y llama atacar() de cada uno. Llega un luchador nuevo: Arquero. ¿Qué cambias?',
      codigo: `for (Luchador l : luchadores) {
    l.atacar();
}`,
      opciones: ['Agregar if (l instanceof Arquero) en Torneo', 'Crear Arquero extends Luchador y redefinir atacar(); Torneo no cambia', 'Copiar Torneo como TorneoArquero', 'Volver atacar() static'],
      correcta: 1,
      explicacion: 'Torneo depende de Luchador, no de cada tipo. Lo nuevo entra como una clase nueva sin tocar lo que ya funciona: abierto a la extensión, cerrado a la modificación.',
    },
  ],
};

export const LETRAS = ['A', 'B', 'C', 'D'];
export const QUIZZES = { [QUIZ_REPASO.id]: QUIZ_REPASO };
