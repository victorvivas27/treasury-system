import { useEffect, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { apiClient } from "@/core/D-config/api";
import "./ManagedCourseBanner.css";

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

  return (
    <aside className="managed-course-banner" aria-label={`Curso administrado: ${course}`}>
      <FiBookOpen aria-hidden="true" />
      <div>
        <span>Tesorería exclusiva para</span>
        <strong>Curso {course}</strong>
      </div>
    </aside>
  );
};
