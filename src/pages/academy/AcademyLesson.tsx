import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { AcademyLessonPlayer } from "@/components/academy/AcademyLessonPlayer";
import { PRODUCER_ACADEMY_BASE } from "@/components/academy/types";

/** Internal Academy lesson. Rendered inside ProductorLayout at /productor/academy/:moduleSlug/:lessonSlug. */
const AcademyLesson = () => {
  const { moduleSlug, lessonSlug } = useParams();

  // The outline sits below the player on small screens, so picking a lesson must return to the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [moduleSlug, lessonSlug]);

  if (!moduleSlug || !lessonSlug) return null;

  return (
    <AcademyLessonPlayer
      basePath={PRODUCER_ACADEMY_BASE}
      moduleSlug={moduleSlug}
      lessonSlug={lessonSlug}
    />
  );
};

export default AcademyLesson;
