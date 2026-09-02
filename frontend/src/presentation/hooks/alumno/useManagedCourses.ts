import { TreasuryRepositoryImpl } from "@/core/C-infra/repositories/treasury/TreasuryRepositoryImpl";
import { useCallback, useEffect, useMemo, useState } from "react";

const normalizeCourse = (course: string) => course.trim().toUpperCase();

const uniqueCourses = (courses: string[]) => {
  const seen = new Set<string>();
  return courses.map(normalizeCourse).filter((course) => {
    if (!course || seen.has(course)) return false;
    seen.add(course);
    return true;
  });
};

export const useManagedCourses = (currentCourse = "") => {
  const repository = useMemo(() => new TreasuryRepositoryImpl(), []);
  const [configuredCourses, setConfiguredCourses] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState("");

  const courses = useMemo(
    () => uniqueCourses([...configuredCourses, currentCourse]),
    [configuredCourses, currentCourse],
  );

  const applyManagedCourses = useCallback((settings: {
    course: string;
    history?: Array<{ course: string }>;
  }) => {
    setConfiguredCourses(uniqueCourses([
      settings.course,
      ...(settings.history ?? []).map((period) => period.course),
    ]));
    setCoursesError("");
  }, []);

  useEffect(() => {
    let active = true;
    repository.getManagedCourseSettings()
      .then((settings) => {
        if (active) applyManagedCourses(settings);
      })
      .catch(() => {
        if (active) setCoursesError("No fue posible cargar los cursos de Administracion");
      })
      .finally(() => {
        if (active) setLoadingCourses(false);
      });

    const handleManagedCourseChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        course: string;
        history?: Array<{ course: string }>;
      } | string>).detail;
      const course = typeof detail === "string" ? detail : detail.course;
      const history = typeof detail === "string" ? undefined : detail.history;
      applyManagedCourses({ course, history });
    };
    window.addEventListener("managed-course-changed", handleManagedCourseChange);

    return () => {
      active = false;
      window.removeEventListener("managed-course-changed", handleManagedCourseChange);
    };
  }, [applyManagedCourses, repository]);

  return { courses, loadingCourses, coursesError };
};
