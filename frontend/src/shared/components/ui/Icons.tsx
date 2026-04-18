import { RxHome, RxPerson } from "react-icons/rx";
import { PiStudent } from "react-icons/pi";
import { BsPerson } from "react-icons/bs";
import { TbPigMoney } from "react-icons/tb";
import { GrPieChart } from "react-icons/gr";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { BiExit } from "react-icons/bi";

export const ICONS = {
  home: RxHome,
  dashboard: GrPieChart,
  usuarios: RxPerson,
  alumnos: PiStudent,
  apoderados: BsPerson,
  tesoreria: TbPigMoney,
  notifications: IoNotificationsOutline,
  settings: IoSettingsOutline,
  logout: BiExit,
};

export const SIDEBAR_LINKS = [
  {
    title: "General",
    links: [
      { label: "Home", path: "/", icon: ICONS.home },
      { label: "Dashboard", path: "/dashboard", icon: ICONS.dashboard },
    ],
  },
  {
    title: "Gestión de Personas",
    links: [
      { label: "Usuarios", path: "/usuarios", icon: ICONS.usuarios },
      { label: "Alumnos", path: "/alumnos", icon: ICONS.alumnos },
      { label: "Apoderados", path: "/apoderados", icon: ICONS.apoderados },
    ],
  },
  {
    title: "Finanzas",
    links: [
      { label: "Tesorería", path: "/tesoreria", icon: ICONS.tesoreria },
    ],
  },
];

export const SIDEBAR_FOOTER_LINKS = [
  { label: "Notificaciones", path: "/notificaciones", icon: ICONS.notifications },
  { label: "Configuración", path: "/configuracion", icon: ICONS.settings },
];

export const SIDEBAR_USER_MOCK = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "/usuario-default.png",
  actions: {
    logoutIcon: ICONS.logout,
    logoutLabel: "Cerrar sesión",
  },
};
