export interface RatedCourse {
  courseId: string;
  rating: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  carrera: string;
  facultad: string;
  semestre: number;
  intereses: string[];
  myList: string[];
  viewedCourses: string[];
  ratedCourses: RatedCourse[];
  isStaff?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  carrera: string;
  facultad: string;
  semestre: number;
}

export const mockUser: User = {
  id: "user-001",
  name: "Estudiante Colombiano",
  email: "ecolombia@unal.edu.co",
  carrera: "Ingeniería de Sistemas",
  facultad: "Facultad de Ingeniería",
  semestre: 5,
  intereses: ["Tecnología", "Ciencias", "Arte"],
  myList: ["tech-1", "arts-2", "sci-1"],
  viewedCourses: ["tech-1", "arts-1", "sci-1", "soc-1", "sp-1", "featured"],
  ratedCourses: [
    { courseId: "tech-1", rating: 5 },
    { courseId: "arts-1", rating: 4 },
  ],
};

export const FACULTADES_UNAL = [
  "Facultad de Ingeniería",
  "Facultad de Ciencias",
  "Facultad de Artes",
  "Facultad de Ciencias Humanas",
  "Facultad de Ciencias Económicas",
  "Facultad de Derecho, Ciencias Políticas y Sociales",
  "Facultad de Medicina",
  "Facultad de Odontología",
  "Facultad de Enfermería",
  "Facultad de Ciencias Agrarias",
  "Bienestar Universitario",
];

export const CARRERAS_UNAL = [
  "Ingeniería de Sistemas",
  "Ingeniería Civil",
  "Ingeniería Industrial",
  "Ingeniería Eléctrica",
  "Ingeniería Mecánica",
  "Ingeniería Química",
  "Matemáticas",
  "Física",
  "Química",
  "Biología",
  "Medicina",
  "Odontología",
  "Enfermería",
  "Derecho",
  "Economía",
  "Administración de Empresas",
  "Diseño Gráfico",
  "Artes Plásticas",
  "Música",
  "Historia",
  "Filosofía",
  "Sociología",
  "Trabajo Social",
  "Agronomía",
  "Veterinaria",
];
