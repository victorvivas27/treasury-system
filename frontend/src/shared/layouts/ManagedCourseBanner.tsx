import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { apiClient } from "@/core/D-config/api";
import "./ManagedCourseBanner.css";

const formatCourse = (course: string) => {
  const normalized = course.trim().replace(/^Curso\s+/i, "")
    .replace(/^(\d+)\s*°?\s*([a-z])$/i, "$1° $2");
  return /\b(básico|medio)\b/i.test(normalized) ? normalized : `${normalized} Básico`;
};

export const ManagedCourseBanner = () => {
  const [course, setCourse] = useState("1A");

  useEffect(() => {
    let active = true;
    const updateCourse = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (active && next) setCourse(next);
    };
    window.addEventListener("managed-course-changed", updateCourse);
    apiClient.get<{ course: string }>("/tesoreria/configuracion-general/curso")
      .then(({ data }) => {
        if (active && data.course) setCourse(data.course);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("managed-course-changed", updateCourse);
    };
  }, []);

  const courseLabel = formatCourse(course);

  return (
    <aside className="managed-course-banner" aria-label={`Tesorería ${courseLabel}`}>
      <FiBookOpen aria-hidden="true" />
      <strong>Tesorería {courseLabel}</strong>
    </aside>
  );
};
