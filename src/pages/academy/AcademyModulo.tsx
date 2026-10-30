import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { AcademyModuleLibrary } from "@/components/academy/AcademyModuleLibrary";
import { PRODUCER_ACADEMY_BASE } from "@/components/academy/types";

/** Internal Academy module. Rendered inside ProductorLayout at /productor/academy/:moduleSlug. */
const AcademyModulo = () => {
  const { moduleSlug } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleSlug]);

  if (!moduleSlug) return null;

  return <AcademyModuleLibrary basePath={PRODUCER_ACADEMY_BASE} moduleSlug={moduleSlug} />;
};

export default AcademyModulo;
