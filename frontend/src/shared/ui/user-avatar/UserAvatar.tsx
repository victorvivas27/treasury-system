import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { User } from "@/core/A-domain/entities/user/User";
import { loadCachedProfileImage } from "./profileImageCache";
import "./UserAvatar.css";

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2)
  .map(part => part.charAt(0).toUpperCase()).join("");

export const UserAvatar = ({ user, className = "", fallbackName = "Usuario", customImageUserId }:
  { user: Pick<User, "nombre" | "profileImageType" | "profileImageUrl"> & { id?: number } | null;
    className?: string; fallbackName?: string; customImageUserId?: number }) => {
  const [source, setSource] = useState<string | null>(
    user?.profileImageType === "PREDEFINED_AVATAR" ? user.profileImageUrl : null);
  const [failed, setFailed] = useState(false);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const [resolving, setResolving] = useState(user?.profileImageType === "CUSTOM_IMAGE");
  const imageRef = useRef<HTMLImageElement>(null);
  const name = user?.nombre ?? fallbackName;

  useEffect(() => {
    let active = true;
    setFailed(false);
    setResolving(user?.profileImageType === "CUSTOM_IMAGE");
    if (user?.profileImageType === "PREDEFINED_AVATAR") {
      setSource(user.profileImageUrl);
    } else if (user?.profileImageType === "CUSTOM_IMAGE") {
      setSource(null);
      loadCachedProfileImage(user, customImageUserId)
        .then((objectUrl) => { if (active) setSource(objectUrl); })
        .catch(() => { if (active) setFailed(true); })
        .finally(() => { if (active) setResolving(false); });
    } else setSource(null);
    return () => { active = false; };
  }, [customImageUserId, user?.id, user?.profileImageType, user?.profileImageUrl]);

  useLayoutEffect(() => {
    if (source && imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      setLoadedSource(source);
    }
  }, [source]);
  const imageLoaded = Boolean(source && loadedSource === source);
  const isLoading = !failed && (resolving || Boolean(source && !imageLoaded));

  return <span className={`user-avatar ${className}`} aria-label={`Avatar de ${name}`}
    aria-busy={isLoading || undefined}>
    {isLoading && <span className="user-avatar__skeleton" aria-hidden="true" />}
    {source && !failed
      ? <>
        <img ref={imageRef} className={imageLoaded ? "is-loaded" : ""} src={source} alt=""
          loading="eager" decoding="async"
          onLoad={() => setLoadedSource(source)} onError={() => setFailed(true)} />
      </>
      : !isLoading && <span aria-hidden="true">{initialsOf(name)}</span>}
  </span>;
};
