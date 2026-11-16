import { createPortal } from "react-dom";
import { useDialogFocus } from "@/shared/ui/dialog/useDialogFocus";
import { LEGAL_DOCUMENTS } from "./legalDocuments";
import "./LegalDocumentDialog.css";

export const LegalDocumentDialog = ({ document, onClose }: {
  document: keyof typeof LEGAL_DOCUMENTS; onClose: () => void;
}) => {
  const ref = useDialogFocus(true, onClose);
  const content = LEGAL_DOCUMENTS[document];
  return createPortal(<section ref={ref} className="login-legal-overlay" role="dialog"
    aria-modal="true" aria-labelledby="login-legal-title" tabIndex={-1}>
    <article className="login-legal-document">
      <header><h2 id="login-legal-title">{content.title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar documento">Cerrar</button></header>
      <div className="login-legal-content" tabIndex={0}>
        {content.text.split(/\n\s*\n/).map((paragraph, index) => paragraph.startsWith("### ")
          ? <h3 key={index}>{paragraph.slice(4)}</h3>
          : <p key={index}>{paragraph.replace(/\*\*/g, "")}</p>)}
      </div>
    </article>
  </section>, window.document.body);
};
