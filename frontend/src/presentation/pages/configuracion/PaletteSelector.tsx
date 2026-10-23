import { FiCheck } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import { PALETTES } from "@/presentation/context/palette";
import "./PaletteSelector.css";

export function PaletteSelector() {
  const { palette, setPalette } = useTheme();
  return <fieldset className="palette-selector">
    <legend>Paleta de colores</legend>
    <p id="palette-help">Elige una identidad. Se aplica al instante en modo claro y oscuro.</p>
    <div className="palette-options" aria-describedby="palette-help">
      {PALETTES.map(({ id, name, description }) => {
        const selected = id === palette;
        return <label className={`palette-option${selected ? " is-selected" : ""}`} key={id}>
          <input type="radio" name="app-palette" value={id}
            checked={selected} onChange={() => setPalette(id)} aria-label={name} />
          <span className="palette-preview" data-palette={id} aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
          </span>
          <span className="palette-option__name">{name}</span>
          <span className="palette-option__description">{description}</span>
          <span className="palette-option__selection" aria-hidden="true">
            <FiCheck /> {selected ? "Activa" : "Elegir"}
          </span>
        </label>;
      })}
    </div>
    <p className="sr-only" role="status">Paleta activa: {PALETTES.find(option => option.id === palette)!.name}</p>
  </fieldset>;
}
