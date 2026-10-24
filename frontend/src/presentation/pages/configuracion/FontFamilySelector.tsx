import { FiCheck } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import { FONT_FAMILIES } from "@/presentation/context/typography";
import "./FontFamilySelector.css";

export function FontFamilySelector() {
  const { fontFamily, setFontFamily } = useTheme();
  const activeName = FONT_FAMILIES.find(({ id }) => id === fontFamily)!.name;

  return <fieldset className="font-family-selector">
    <legend>Tipografía</legend>
    <p id="font-family-help">Compara cada muestra y elige una familia para toda la interfaz.</p>
    <div className="font-family-options" aria-describedby="font-family-help">
      {FONT_FAMILIES.map(({ id, name }) => {
        const selected = id === fontFamily;
        return <label className={`font-family-option${selected ? " is-selected" : ""}`} key={id}>
          <input type="radio" name="app-font-family" value={id}
            checked={selected} onChange={() => setFontFamily(id)} aria-label={name} />
          <span className="font-family-option__sample" data-font-preview={id} aria-hidden="true">Aa Gg 0123</span>
          <span className="font-family-option__name">{name}</span>
          <span className="font-family-option__selection" aria-hidden="true">
            <FiCheck /> {selected ? "Activa" : "Elegir"}
          </span>
        </label>;
      })}
    </div>
    <p className="sr-only" role="status">Tipografía activa: {activeName}</p>
  </fieldset>;
}
