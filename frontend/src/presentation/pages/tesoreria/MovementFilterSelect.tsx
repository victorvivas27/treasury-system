import { CompactSelect } from "@/shared/ui/compactselect/CompactSelect";

type FilterOption = { value: string; label: string };
export const MovementFilterSelect = ({ label, value, options, placeholder, onChange }: {
  label: string; value: string; options: readonly FilterOption[]; placeholder?: string;
  onChange: (value: string) => void;
}) => <div className="movement-filter-field"><span>{label}</span>
  <CompactSelect value={value} options={options} placeholder={placeholder ?? ""}
    ariaLabel={label} allowEmpty={placeholder !== undefined} onChange={onChange}
    portal menuClassName="movement-filter-options" />
</div>;
