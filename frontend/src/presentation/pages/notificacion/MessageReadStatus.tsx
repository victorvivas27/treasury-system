import { MdDone, MdDoneAll } from "react-icons/md";

export const MessageReadStatus = ({ read }: { read: boolean }) =>
  <span className={`message-read-status ${read ? "is-read" : "is-pending"}`}
    role="img" aria-label={read ? "Leído" : "Sin leer"}
    title={read ? "El destinatario leyó este mensaje" : "El destinatario aún no ha leído este mensaje"}>
    {read ? <MdDoneAll aria-hidden="true" /> : <MdDone aria-hidden="true" />}
  </span>;

