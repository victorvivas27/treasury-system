import { useEffect, useState } from "react";
import type { User } from "@/core/A-domain/entities/user/User";
import { UserRepositoryImpl } from "@/core/C-infra/repositories/user/UserRepositoryImpl";
import "./UserAvatar.css";

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2)
  .map(part => part.charAt(0).toUpperCase()).join("");

export const UserAvatar = ({ user, className = "", fallbackName = "Usuario" }:
  { user: Pick<User, "nombre" | "profileImageType" | "profileImageUrl"> | null;
    className?: string; fallbackName?: string }) => {
  const [source, setSource] = useState<string | null>(
    user?.profileImageType === "PREDEFINED_AVATAR" ? user.profileImageUrl : null);
  const [failed, setFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const name = user?.nombre ?? fallbackName;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    setImageLoaded(false);
    if (user?.profileImageType === "PREDEFINED_AVATAR") {
      setSource(user.profileImageUrl);
    } else if (user?.profileImageType === "CUSTOM_IMAGE") {
      setSource(null);
      new UserRepositoryImpl().getProfileImage(user.profileImageUrl ?? undefined).then(blob => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSource(objectUrl);
      }).catch(() => { if (active) setFailed(true); });
    } else setSource(null);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [user?.profileImageType, user?.profileImageUrl]);

  const isLoading = Boolean(source && !failed && !imageLoaded);

  return <span className={`user-avatar ${className}`} aria-label={`Avatar de ${name}`}
    aria-busy={isLoading || undefined}>
    {source && !failed
      ? <>
        {isLoading && <span className="user-avatar__skeleton" aria-hidden="true" />}
        <img className={imageLoaded ? "is-loaded" : ""} src={source} alt=""
          onLoad={() => setImageLoaded(true)} onError={() => setFailed(true)} />
      </>
      : <span aria-hidden="true">{initialsOf(name)}</span>}
  </span>;
};
