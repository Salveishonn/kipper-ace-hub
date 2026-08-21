import { AcademyModuleLibrary } from "@/components/academy/AcademyModuleLibrary";
import { PRODUCER_ACADEMY_BASE } from "@/components/academy/types";

/** Internal Academy library. Rendered inside ProductorLayout at /productor/academy. */
const AcademyContenido = () => <AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} />;

export default AcademyContenido;
