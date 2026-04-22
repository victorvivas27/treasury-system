import { ApoderadosList } from "@/presentation/features/apoderado/ApoderadosList";
import { useApoderados } from "@/presentation/hooks/apoderado/useApoderados";



export const ApoderadoPage = () => {
   const { apoderados, loading, error, refetch } = useApoderados();
  return (
    <div className="">
      <div className="">
        <h1 className="">Lista de Apoderados</h1>
        <button
          onClick={refetch}
          className=""
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <ApoderadosList
        apoderados={apoderados}
        loading={loading}
        error={error}
        onRefresh={refetch}
      />
    </div>
  );
};
