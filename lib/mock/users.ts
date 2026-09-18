import type { User } from "@/lib/types";

export const users: User[] = [
  {
    id: "u-carlos",
    name: "Carlos Mendoza Salazar",
    shortName: "Carlos Mendoza",
    initials: "CM",
    role: "MÉDICO",
    email: "c.mendoza@hospitaldemo.pe",
    institution: "Hospital Regional Demo",
    cmp: "084521",
    specialty: "Medicina Interna",
    rne: "045821",
    council: "La Libertad",
  },
  {
    id: "u-rosa",
    name: "Rosa Huamán Vega",
    shortName: "Rosa Huamán",
    initials: "RH",
    role: "ADMIN",
    email: "r.huaman@hospitaldemo.pe",
    institution: "Hospital Regional Demo",
  },
  {
    id: "u-luis",
    name: "Luis Paredes Ortiz",
    shortName: "Luis Paredes",
    initials: "LP",
    role: "ADMIN",
    email: "l.paredes@hospitaldemo.pe",
    institution: "Hospital Regional Demo",
    cmp: "059310",
  },
  {
    id: "u-elena",
    name: "Elena Quispe Ramos",
    shortName: "Elena Quispe",
    initials: "EQ",
    role: "DIGITALIZADOR",
    email: "e.quispe@hospitaldemo.pe",
    institution: "Hospital Regional Demo",
  },
  {
    id: "u-ana",
    name: "Ana Valdivia Cruz",
    shortName: "Ana Valdivia",
    initials: "AV",
    role: "MÉDICO",
    email: "a.valdivia@clinicademo.pe",
    institution: "Clínica Demo Norte",
    cmp: "071402",
    specialty: "Emergencia",
    rne: "038112",
    council: "La Libertad",
  },
];

export function getUser(id: string) {
  return users.find((user) => user.id === id);
}

export const EMAIL_CODE = "246810";
