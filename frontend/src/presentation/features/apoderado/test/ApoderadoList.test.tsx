import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { ApoderadosList } from "../ApoderadosList";

describe("Apoderado List", () => {

  it('debería renderizar sin errores', () => {
    render(<ApoderadosList apoderados={[]} loading={false} error={null} />);
  });
});
