import { RxHome, RxPerson } from "react-icons/rx";
import { PiStudent } from "react-icons/pi";
import { BsPerson } from "react-icons/bs";
import { TbPigMoney } from "react-icons/tb";
import { GrPieChart } from "react-icons/gr";
import { IoNotificationsOutline, IoSettingsOutline } from "react-icons/io5";
import { BiExit } from "react-icons/bi";
import { FcConferenceCall } from "react-icons/fc";
import { TfiReload } from "react-icons/tfi";
import { RiUserAddLine } from "react-icons/ri";
import { MdOutlineDeleteOutline, MdFamilyRestroom } from "react-icons/md";
import { GrEdit } from "react-icons/gr";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import { TiArrowBackOutline } from "react-icons/ti";
import { MdOutlineCancel } from "react-icons/md";



export const ICONS = {
  home: RxHome,
  dashboard: GrPieChart,
  usuarios: RxPerson,
  alumnos: PiStudent,
  apoderados: BsPerson,
  familia: MdFamilyRestroom,
  tesoreria: TbPigMoney,
  notifications: IoNotificationsOutline,
  settings: IoSettingsOutline,
  logout: BiExit,
  crearFamilia: AiOutlineUsergroupAdd
};

export const SIDEBAR_LINKS = [
  {
    title: "General",
    links: [
      { label: "Home", path: "/", icon: ICONS.home },

    ],
  },
  {
    title: "Gestión de Personas",
    links: [
      { label: "Usuarios", path: "/users", icon: ICONS.usuarios },
      { label: "Alumnos", path: "/students", icon: ICONS.alumnos },
      { label: "Apoderados", path: "/parents", icon: ICONS.apoderados },
      { label: "Familia", path: "/family", icon: ICONS.familia },
    ],
  },
  {
    title: "Finanzas",
    links: [
      { label: "Tesorería", path: "/treasury", icon: ICONS.tesoreria },
      { label: "Dashboard", path: "/dashboard", icon: ICONS.dashboard },
    ],
  },
];

export const SIDEBAR_FOOTER_LINKS = [
  { label: "Notificaciones", path: "/notifications", icon: ICONS.notifications },
  { label: "Configuración", path: "/configuration", icon: ICONS.settings },
];

export const APODERADOS_ICONS = {
  conference: FcConferenceCall,
  reload: TfiReload,
  add: RiUserAddLine,
  delete: MdOutlineDeleteOutline,
  edit: GrEdit,
  back: TiArrowBackOutline,
  cancel: MdOutlineCancel
};

export const ALUMNOS_ICONS = {
  conference: FcConferenceCall,
  reload: TfiReload,
  add: RiUserAddLine,
  delete: MdOutlineDeleteOutline,
  edit: GrEdit,
  save: GrEdit,
  back: TiArrowBackOutline,
  cancel: MdOutlineCancel
};

export const FAMILIA_ICONS = {
  conference: FcConferenceCall,
  reload: TfiReload,
  add: RiUserAddLine,
  delete: MdOutlineDeleteOutline,
  edit: GrEdit,
  save: GrEdit,
  crearFamilia: AiOutlineUsergroupAdd,
  back: TiArrowBackOutline,
  cancel: MdOutlineCancel
};



export const SIDEBAR_USER_MOCK = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatar: "/usuario-default.png",
  actions: {
    logoutIcon: ICONS.logout,
    logoutLabel: "Cerrar sesión",
  },
};
