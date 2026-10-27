import { StrictMode, useLayoutEffect } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ModalConfirm } from "../modalconfirm/ModalConfirm";
import { LoadingState } from "../loading/LoadingState";
import { ModalAlert } from "../modalalert/ModalAler";

afterEach(() => { document.body.style.overflow = ""; });
const noop = () => {};
function Overlays({ modal, loading }: { modal: boolean; loading: boolean }) {
 return <StrictMode>
  <ModalConfirm isOpen={modal} message="Confirmar" onConfirm={noop} onCancel={noop} />
  {loading && <LoadingState />}
 </StrictMode>;
}
it.each([true, false])("restaura el scroll al cerrar overlays en distinto orden: %s", (closeModalFirst) => {
 document.body.style.overflow = "auto";
 const view = render(<Overlays modal loading />);
 expect(document.body.style.overflow).toBe("hidden");
 view.rerender(<Overlays modal={!closeModalFirst} loading={closeModalFirst} />);
 expect(document.body.style.overflow).toBe("hidden");
 view.rerender(<Overlays modal={false} loading={false} />);
 expect(document.body.style.overflow).toBe("auto");
 expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("restaura el scroll al desmontar la pantalla con overlays abiertos", () => {
 const view = render(<Overlays modal loading />);
 view.unmount();
 expect(document.body.style.overflow).toBe("");
});

it("bloquea el fondo antes de mostrar la confirmación y lo restaura antes del siguiente pintado", () => {
 const observed: string[] = [];
 function Confirmation({ open }: { open: boolean }) {
  useLayoutEffect(() => { observed.push(document.body.style.overflow); }, [open]);
  return <ModalAlert isOpen={open} message="Revisa tu correo" type="success"
   autoCloseTime={0} onClose={noop} />;
 }
 document.body.style.overflow = "auto";
 const view = render(<StrictMode><Confirmation open /></StrictMode>);
 expect(observed.every(value => value === "hidden")).toBe(true);
 view.rerender(<StrictMode><Confirmation open={false} /></StrictMode>);
 expect(observed.at(-1)).toBe("auto");
});
