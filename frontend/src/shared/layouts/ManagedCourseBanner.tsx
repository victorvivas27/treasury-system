import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { apiClient } from "@/core/D-config/api";
import "./ManagedCourseBanner.css";

const formatCourse = (course: string) => {
  return course.trim().replace(/^Curso\s+/i, "")
    .replace(/^(\d+)\s*°?\s*([a-z])$/i, "$1° $2");
};

export const ManagedCourseBanner = () => {
  const [course, setCourse] = useState("1A");
  const [schoolYear, setSchoolYear] = useState(new Date().getFullYear());

  useEffect(() => {
    let active = true;
    const updateCourse = (event: Event) => {
      const next = (event as CustomEvent<string | { course: string; schoolYear: number }>).detail;
      if (!active || !next) return;
      if (typeof next === "string") setCourse(next);
      else {
        setCourse(next.course);
        setSchoolYear(next.schoolYear);
      }
    };
    window.addEventListener("managed-course-changed", updateCourse);
    apiClient.get<{ course: string; schoolYear: number }>("/tesoreria/configuracion-general/curso")
      .then(({ data }) => {
        if (active && data.course) setCourse(data.course);
        if (active && data.schoolYear) setSchoolYear(data.schoolYear);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener("managed-course-changed", updateCourse);
    };
  }, []);

  const courseLabel = formatCourse(course);

  return (
    <aside className="managed-course-banner" aria-label={`Tesorería ${courseLabel}, año ${schoolYear}`}>
      <FiBookOpen aria-hidden="true" />
      <strong>Tesorería {courseLabel}</strong>
      <span>{schoolYear}</span>
    </aside>
  );
};
