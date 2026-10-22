import { AboutCylinder } from "./AboutCylinder";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { FiCamera, FiChevronLeft, FiChevronRight, FiUsers } from "react-icons/fi";
import { useTheme } from "@/presentation/context/ThemeContext";
import { UserAvatar } from "@/shared/ui/user-avatar/UserAvatar";
import "../style/HomeCommunity.css";
import { homeCommunityCache } from "../hooks/homeCommunityCache";

const boardLabels = { PRESIDENTE: "Presidente/a", VICEPRESIDENTE: "Vicepresidente/a",
  SECRETARIA: "Secretario/a", TESORERO: "Tesorero/a", PASTORAL: "Pastoral",
  COORDINADOR_DEPORTIVO: "Coordinador/a deportivo/a" } as const;
const boardSlots = [
  { role: "PRESIDENTE", position: 1 }, { role: "VICEPRESIDENTE", position: 1 },
  { role: "SECRETARIA", position: 1 }, { role: "TESORERO", position: 1 },
  { role: "PASTORAL", position: 1 }, { role: "PASTORAL", position: 2 },
  { role: "COORDINADOR_DEPORTIVO", position: 1 },
] as const;

const Lottie = lazy(() => import("lottie-react").then(module => ({ default: module.Lottie })));
const animationRequests = new Map<string, Promise<object>>();
const loadAnimation = (file: string) => {
  if (!animationRequests.has(file)) {
    const request = fetch(`/icons/${encodeURIComponent(file)}.json`)
      .then(response => {
        if (!response.ok) throw new Error("Animation unavailable");
        return response.json() as Promise<object>;
      }).catch(error => { animationRequests.delete(file); throw error; });
    animationRequests.set(file, request);
  }
  return animationRequests.get(file)!;
};

const lottieColor = (value: string) => {
  const normalized = value.trim();
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    const full = hex.length === 3 ? hex.split("").map(item => item + item).join("") : hex;
    return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16) / 255);
  }
  const channels = normalized.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [0, 0, 0];
  return channels.map(channel => channel / 255);
};

const themedCommunityAnimation = (animation: object) => {
  const styles = getComputedStyle(document.documentElement);
  const colors = {
    accent: lottieColor(styles.getPropertyValue("--color-accent")),
    surface: lottieColor(styles.getPropertyValue("--color-surface")),
    text: lottieColor(styles.getPropertyValue("--text-main")),
  };
  const copy = structuredClone(animation) as Record<string, unknown>;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const item = value as Record<string, unknown>;
    const color = item.c as { k?: number[] } | undefined;
    if ((item.ty === "st" || item.ty === "fl") && Array.isArray(color?.k)) {
      const original = color.k;
      color.k = item.ty === "fl" ? colors.surface
        : original[0] + original[1] + original[2] < .15 ? colors.text : colors.accent;
    }
    Object.values(item).forEach(visit);
  };
  visit(copy);
  return copy;
};

const CommunityIcon = ({ file, name, speed = .85, fallback = null }: {
  file: string;
  name: string;
  speed?: number;
  fallback?: ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const [animationData, setAnimationData] = useState<object>();
  useEffect(() => {
    let active = true;
    loadAnimation(file)
      .then(animation => { if (active) setAnimationData(themedCommunityAnimation(animation)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [file, resolvedTheme]);
  return <span className={`home-community__${name}-icon`} aria-hidden="true">
    <Suspense fallback={fallback}>
      {animationData ? <Lottie key={resolvedTheme} src={animationData} speed={speed}
        loop autoplay /> : fallback}
    </Suspense>
  </span>;
};

export const HomeCommunity = () => {
  const { sections, photos, board } = useSyncExternalStore(
    homeCommunityCache.subscribe, homeCommunityCache.getSnapshot);
  const [activePhoto, setActivePhoto] = useState(0);
  const dragStart = useRef<number | undefined>(undefined);
  const dragged = useRef(false);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [carouselCycle, setCarouselCycle] = useState(0);
  const boardTrackRef = useRef<HTMLDivElement>(null);
  const moveBoard = (direction: number) => boardTrackRef.current?.scrollBy({
    left: direction * boardTrackRef.current.clientWidth * .78, behavior: "smooth",
  });
  useEffect(() => { setActivePhoto(current => Math.min(current, Math.max(0, photos.length - 1))); }, [photos.length]);
  useEffect(() => {
    if (photos.length < 2 || carouselPaused) return;
    const timer = window.setTimeout(() => setActivePhoto(current =>
      (current + 1) % photos.length), 5500);
    return () => window.clearTimeout(timer);
  }, [activePhoto, carouselCycle, carouselPaused, photos.length]);
  const showPhoto = (index: number) => {
    if (!photos.length) return;
    setActivePhoto((index + photos.length) % photos.length);
    setCarouselCycle(value => value + 1);
  };
  const movePhoto = (direction: number) => showPhoto(activePhoto + direction);
  const photoPosition = (index: number) => {
    if (index === activePhoto) return "is-active";
    if ((index - activePhoto + photos.length) % photos.length === 1) return "is-next";
    return (activePhoto - index + photos.length) % photos.length === 1 ? "is-previous" : "";
  };
  return (
  <div className="home-community">
    <section id="sobre-nosotros" className="home-community__about" data-home-reveal
      data-home-scroll-repeat data-home-community-repeat>
      <header className="home-community__title-banner">
        <CommunityIcon file="Heart" name="heart" />
        <div>
          <h2>Lo que nos mueve</h2>
        </div>
      </header>
      <AboutCylinder sections={sections} />
    </section>

    <section id="fotos-del-curso" className="home-community__content" data-home-reveal>
      <header className="home-community__photo-heading">
        <CommunityIcon file="Camera V3" name="camera" fallback={<img src="/icons/Camera%20V3.svg" alt="" />} />
        <div><h2>Nuestros momentos</h2>
          <p>Historias compartidas que merecen quedarse con nosotros.</p></div>
      </header>
      {photos.length > 0 ? <div className="home-community__carousel" role="region"
        aria-roledescription="carrusel" aria-label="Nuestros momentos" tabIndex={0}
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={event => setCarouselPaused(event.currentTarget.contains(document.activeElement))}
        onFocus={() => setCarouselPaused(true)}
        onBlur={event => setCarouselPaused(event.currentTarget.contains(event.relatedTarget)
          || event.currentTarget.matches(":hover"))}
        onKeyDown={event => {
          if (event.key === "ArrowLeft") { event.preventDefault(); movePhoto(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); movePhoto(1); }
        }} onPointerDown={event => {
          if ((event.target as HTMLElement).closest("button")) return;
          dragged.current = false;
          dragStart.current = event.clientX;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={event => {
          if (dragStart.current !== undefined && Math.abs(event.clientX - dragStart.current) > 35) {
            dragged.current = true;
            movePhoto(event.clientX < dragStart.current ? 1 : -1);
          }
          dragStart.current = undefined;
        }} onPointerCancel={() => { dragStart.current = undefined; }}>
        <div className="home-community__photo-gallery" aria-live={carouselPaused ? "polite" : "off"}>
          {photos.map((photo, index) => <figure key={photo.id}
            className={photoPosition(index)} aria-hidden={index !== activePhoto}
            onClick={() => { if (!dragged.current) showPhoto(index); }}>
            <div className={`home-community__photo-media ${photo.contained ? "uses-contain" : "uses-cover"}`}>
              <img className="home-community__photo-backdrop" src={photo.url} alt=""
                aria-hidden="true" draggable={false} />
              <img className="home-community__photo-image" src={photo.url}
                alt={photo.caption || `Momento del curso ${index + 1}`}
                style={{ objectPosition: photo.objectPosition ?? "50% 50%" }}
                loading={index === 0 ? "eager" : "lazy"} draggable={false} />
            </div>
            <figcaption>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><small>Recuerdo del curso</small>
                <p>{photo.caption || "Un momento que forma parte de nuestra historia."}</p></div>
            </figcaption>
          </figure>)}
          {photos.length > 1 && <div className="home-community__carousel-controls">
            <button className="home-community__carousel-arrow is-previous" type="button"
              aria-label="Ver foto anterior" onClick={() => movePhoto(-1)}><FiChevronLeft /></button>
            <button className="home-community__carousel-arrow is-next" type="button"
              aria-label="Ver foto siguiente" onClick={() => movePhoto(1)}><FiChevronRight /></button>
          </div>}
        </div>
          <div className="home-community__carousel-dots" aria-label={photos.length > 1 ? "Seleccionar fotografía" : undefined}>
            {photos.length > 1 && photos.map((photo, index) => <button key={photo.id} type="button"
              className={index === activePhoto ? "is-active" : ""}
              aria-label={`Ver foto ${index + 1}`} aria-current={index === activePhoto ? "true" : undefined}
              onClick={() => showPhoto(index)} />)}
          </div>
      </div> : <div className="home-community__photo-placeholder" role="img"
          aria-label="Galería de fotos del curso pendiente de publicación">
          <FiCamera aria-hidden="true" /><span>Galería del curso</span>
        </div>}
    </section>

    <section id="directiva" className="home-community__content" data-home-reveal>
      <div className="home-community__board-heading">
        <CommunityIcon file="Staff" name="staff" speed={.8} fallback={<FiUsers />} />
        <div><span className="home-community__eyebrow">Directiva</span>
          <h2>Representantes del curso</h2></div>
      </div>
      <div className="home-community__board-carousel" role="region" aria-label="Integrantes de la directiva">
        <button className="home-community__board-arrow is-previous" type="button"
          aria-label="Ver representantes anteriores" onClick={() => moveBoard(-1)}>
          <FiChevronLeft /></button>
        <div className="home-community__board" ref={boardTrackRef} tabIndex={0}
          onKeyDown={event => {
            if (event.key === "ArrowLeft") { event.preventDefault(); moveBoard(-1); }
            if (event.key === "ArrowRight") { event.preventDefault(); moveBoard(1); }
          }}>
          {boardSlots.map((slot, index) => {
          const member = board.find(item => item.role === slot.role && item.positionNumber === slot.position);
          const roleLabel = `${boardLabels[slot.role]}${slot.role === "PASTORAL" ? ` ${slot.position}` : ""}`;
          return <article key={`${slot.role}-${slot.position}`}
            className={`is-${slot.role.toLowerCase()}`}
            style={{ "--board-delay": `calc(${index} * 120ms)` } as CSSProperties}>
            {member ? <UserAvatar className="home-community__board-avatar"
              customImageUserId={member.userId ?? undefined} user={{ nombre: member.nombre,
                profileImageType: member.profileImageType, profileImageUrl: member.profileImageUrl }} />
              : <span className="home-community__board-avatar is-empty" aria-hidden="true">
                {roleLabel.charAt(0)}</span>}
            <small>{roleLabel}</small>
            <h3>{member?.nombre ?? "Información por publicar"}</h3>
            {member && <a href={`mailto:${member.email}`}>{member.email}</a>}
          </article>;
          })}
        </div>
        <button className="home-community__board-arrow is-next" type="button"
          aria-label="Ver representantes siguientes" onClick={() => moveBoard(1)}>
          <FiChevronRight /></button>
      </div>
    </section>

  </div>
  );
};
